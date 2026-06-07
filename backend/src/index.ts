import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

app.use(cors());
app.use(express.json());

// -----------------------------------------------------------------------------
// Helper Functions for Data Formatting
// -----------------------------------------------------------------------------

async function formatUserAsync(u: any) {
  if (!u) return null;
  // Fetch latest device FCM token
  const latestDevice = await prisma.userDevice.findFirst({
    where: { userId: u.id },
    orderBy: { createdAt: 'desc' }
  });
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    username: u.username,
    plan: 'FREE',
    avatarUrl: u.profileImageUrl || null,
    pushToken: latestDevice?.fcmToken || null,
    createdAt: u.createdAt
  };
}

function formatCircle(c: any) {
  if (!c) return null;
  return {
    id: c.id,
    ownerId: c.ownerId,
    circleName: c.name, // maps name -> circleName
    createdAt: c.createdAt,
    owner: {
      id: c.owner.id,
      username: c.owner.username,
      name: c.owner.name,
      avatarUrl: c.owner.profileImageUrl || null
    },
    members: (c.members || []).map((m: any) => ({
      id: m.id,
      circleId: m.circleId,
      userId: m.userId,
      user: {
        id: m.user.id,
        username: m.user.username,
        name: m.user.name,
        avatarUrl: m.user.profileImageUrl || null
      }
    }))
  };
}

function formatMoment(m: any) {
  if (!m) return null;
  return {
    id: m.id,
    photoUrl: m.imageUrl, // maps imageUrl -> photoUrl
    caption: m.caption,
    senderId: m.senderId,
    circleId: m.circleId,
    createdAt: m.createdAt,
    sender: {
      id: m.sender.id,
      username: m.sender.username,
      avatarUrl: m.sender.profileImageUrl || null
    },
    circle: formatCircle(m.circle),
    reactions: (m.reactions || []).map((r: any) => ({
      id: r.id,
      momentId: r.momentId,
      userId: r.userId,
      emoji: r.emoji,
      createdAt: r.createdAt,
      user: {
        id: r.user.id,
        username: r.user.username
      }
    }))
  };
}

// -----------------------------------------------------------------------------
// Helper Functions for Referral & Friends Pairing
// -----------------------------------------------------------------------------

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function connectUsersAsFriends(inviterId: string, inviteeId: string) {
  try {
    // 1. Establish mutual friendship (insert reciprocal entries in the Friend table)
    await prisma.friend.upsert({
      where: { userId_friendId: { userId: inviterId, friendId: inviteeId } },
      update: {},
      create: { userId: inviterId, friendId: inviteeId }
    });
    await prisma.friend.upsert({
      where: { userId_friendId: { userId: inviteeId, friendId: inviterId } },
      update: {},
      create: { userId: inviteeId, friendId: inviterId }
    });

    // 2. Add invitee to inviter's default circle ("Best Friends")
    const inviterCircle = await prisma.circle.findFirst({
      where: { ownerId: inviterId, name: 'Best Friends' }
    });
    if (inviterCircle) {
      await prisma.circleMember.upsert({
        where: { circleId_userId: { circleId: inviterCircle.id, userId: inviteeId } },
        update: {},
        create: { circleId: inviterCircle.id, userId: inviteeId, role: 'MEMBER' }
      });
    }

    // 3. Add inviter to invitee's default circle ("Best Friends")
    const inviteeCircle = await prisma.circle.findFirst({
      where: { ownerId: inviteeId, name: 'Best Friends' }
    });
    if (inviteeCircle) {
      await prisma.circleMember.upsert({
        where: { circleId_userId: { circleId: inviteeCircle.id, userId: inviterId } },
        update: {},
        create: { circleId: inviteeCircle.id, userId: inviterId, role: 'MEMBER' }
      });
    }

    console.log(`[Referral System] Connected inviter ${inviterId} and invitee ${inviteeId} as friends.`);
  } catch (err) {
    console.error('Error auto connecting friends:', err);
  }
}

async function handleReferralIfProvided(inviteCode: string | undefined, inviteeId: string) {
  if (!inviteCode) return;
  try {
    const invite = await prisma.invitation.findUnique({
      where: { inviteCode }
    });
    
    if (invite) {
      await connectUsersAsFriends(invite.inviterId, inviteeId);
      
      // Update counts and register event
      await prisma.invitation.update({
        where: { inviteCode },
        data: {
          installCount: { increment: 1 },
          acceptedCount: { increment: 1 }
        }
      });

      await prisma.invitationEvent.create({
        data: {
          invitationId: invite.id,
          eventType: 'REGISTER'
        }
      });

      console.log(`[Referral System] Handled registration referral for code ${inviteCode}`);
    } else {
      console.log(`[Referral System] Invitation code ${inviteCode} was not found.`);
    }
  } catch (err) {
    console.error('Error handling registration referral logic:', err);
  }
}

// -----------------------------------------------------------------------------
// Authentication Endpoints
// -----------------------------------------------------------------------------

// POST /api/auth/register
app.post('/api/auth/register', async (req: Request, res: Response): Promise<any> => {
  let { username, name, email, phone, avatarUrl, inviteCode } = req.body;
  username = username?.trim();
  name = name?.trim();
  email = email?.trim();
  phone = phone?.trim();

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: username, mode: 'insensitive' as const } },
          email ? { email: { equals: email, mode: 'insensitive' as const } } : {},
          phone ? { phone } : {}
        ].filter(cond => Object.keys(cond).length > 0)
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username, email, or phone already registered' });
    }

    const user = await prisma.user.create({
      data: {
        username,
        name,
        email,
        phone,
        profileImageUrl: avatarUrl,
        status: 'ACTIVE'
      }
    });

    // Create default settings
    await prisma.userSetting.create({
      data: {
        userId: user.id,
        darkMode: false,
        pushNotifications: true,
        emailNotifications: true
      }
    });

    // Automatically create a default circle for the user
    const defaultCircle = await prisma.circle.create({
      data: {
        ownerId: user.id,
        name: 'Best Friends'
      }
    });

    await prisma.circleMember.create({
      data: {
        circleId: defaultCircle.id,
        userId: user.id,
        role: 'OWNER'
      }
    });

    // Process invitation code if it was passed during sign up
    if (inviteCode) {
      await handleReferralIfProvided(inviteCode, user.id);
    }

    res.status(201).json({ user: await formatUserAsync(user) });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error during registration' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req: Request, res: Response): Promise<any> => {
  let { loginIdentifier } = req.body; // username, email, or phone
  loginIdentifier = loginIdentifier?.trim();
  if (!loginIdentifier) {
    return res.status(400).json({ error: 'Login identifier (username/email/phone) is required' });
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: loginIdentifier, mode: 'insensitive' as const } },
          { email: { equals: loginIdentifier, mode: 'insensitive' as const } },
          { phone: loginIdentifier }
        ]
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const mockOtp = '123456';
    res.json({ message: 'Verification code sent', user: await formatUserAsync(user), otpCode: mockOtp });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error during login' });
  }
});

// POST /api/auth/verify
app.post('/api/auth/verify', async (req: Request, res: Response): Promise<any> => {
  const { userId, code, inviteCode } = req.body;
  if (!userId || !code) {
    return res.status(400).json({ error: 'User ID and verification code are required' });
  }

  if (code !== '123456') {
    return res.status(400).json({ error: 'Invalid verification code' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Process invitation if passed on OTP verification
    if (inviteCode) {
      await handleReferralIfProvided(inviteCode, user.id);
    }

    const token = `mock-jwt-token-for-${user.id}`;
    res.json({ token, user: await formatUserAsync(user) });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error during verification' });
  }
});

// POST /api/auth/google
app.post('/api/auth/google', async (req: Request, res: Response): Promise<any> => {
  const { email, name, avatarUrl, username, inviteCode } = req.body;
  if (!email || !username) {
    return res.status(400).json({ error: 'Email and Username are required for Google authentication' });
  }

  try {
    let user = await prisma.user.findUnique({ where: { email } });
    let isNewUser = false;
    
    if (!user) {
      isNewUser = true;
      user = await prisma.user.create({
        data: {
          username,
          name,
          email,
          profileImageUrl: avatarUrl,
          status: 'ACTIVE'
        }
      });

      await prisma.userSetting.create({
        data: {
          userId: user.id,
          darkMode: false,
          pushNotifications: true,
          emailNotifications: true
        }
      });

      const defaultCircle = await prisma.circle.create({
        data: {
          ownerId: user.id,
          name: 'Best Friends'
        }
      });

      await prisma.circleMember.create({
        data: {
          circleId: defaultCircle.id,
          userId: user.id,
          role: 'OWNER'
        }
      });
    }

    if (isNewUser && inviteCode) {
      await handleReferralIfProvided(inviteCode, user.id);
    }

    const token = `mock-google-jwt-token-for-${user.id}`;
    res.json({ token, user: await formatUserAsync(user) });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error during Google auth' });
  }
});

// POST /api/auth/phone
app.post('/api/auth/phone', async (req: Request, res: Response): Promise<any> => {
  let { phone, username, name, inviteCode } = req.body;
  phone = phone?.trim();
  username = username?.trim();
  name = name?.trim();
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  try {
    let user = await prisma.user.findUnique({ where: { phone } });
    let isNewUser = false;

    if (!user) {
      if (!username) {
        return res.status(400).json({ error: 'Username is required for new registration via phone' });
      }
      isNewUser = true;
      user = await prisma.user.create({
        data: {
          phone,
          username,
          name: name || 'Phone User',
          status: 'ACTIVE'
        }
      });

      await prisma.userSetting.create({
        data: {
          userId: user.id,
          darkMode: false,
          pushNotifications: true,
          emailNotifications: true
        }
      });

      const defaultCircle = await prisma.circle.create({
        data: {
          ownerId: user.id,
          name: 'Best Friends'
        }
      });

      await prisma.circleMember.create({
        data: {
          circleId: defaultCircle.id,
          userId: user.id,
          role: 'OWNER'
        }
      });
    }

    if (isNewUser && inviteCode) {
      await handleReferralIfProvided(inviteCode, user.id);
    }

    const mockOtp = '123456';
    res.json({ message: 'Verification code sent', user: await formatUserAsync(user), otpCode: mockOtp });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error during Phone auth' });
  }
});

// POST /api/auth/update-push-token
app.post('/api/auth/update-push-token', async (req: Request, res: Response): Promise<any> => {
  const { userId, pushToken } = req.body;
  if (!userId || !pushToken) {
    return res.status(400).json({ error: 'User ID and push token are required' });
  }

  try {
    const existingDevice = await prisma.userDevice.findFirst({
      where: { userId, fcmToken: pushToken }
    });
    
    if (!existingDevice) {
      await prisma.userDevice.create({
        data: {
          userId,
          fcmToken: pushToken,
          deviceType: 'MOBILE'
        }
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    res.json({ user: await formatUserAsync(user) });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error updating push token' });
  }
});

// -----------------------------------------------------------------------------
// Friends Endpoints
// -----------------------------------------------------------------------------

// POST /api/friends/request
app.post('/api/friends/request', async (req: Request, res: Response): Promise<any> => {
  let { senderId, receiverUsername } = req.body;
  receiverUsername = receiverUsername?.trim();
  if (!senderId || !receiverUsername) {
    return res.status(400).json({ error: 'Sender ID and receiver username are required' });
  }

  try {
    const receiver = await prisma.user.findFirst({
      where: {
        username: {
          equals: receiverUsername,
          mode: 'insensitive' as const
        }
      }
    });
    if (!receiver) {
      return res.status(404).json({ error: 'Receiver user not found' });
    }

    if (senderId === receiver.id) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    const sender = await prisma.user.findUnique({
      where: { id: senderId }
    });
    if (!sender) {
      return res.status(404).json({ error: 'Sender user not found' });
    }

    // Check if they are already friends
    const alreadyFriends = await prisma.friend.findFirst({
      where: {
        OR: [
          { userId: senderId, friendId: receiver.id },
          { userId: receiver.id, friendId: senderId }
        ]
      }
    });

    if (alreadyFriends) {
      return res.status(400).json({ error: 'You are already friends', status: 'ACCEPTED' });
    }

    const existingRequest = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId: receiver.id },
          { senderId: receiver.id, receiverId: senderId }
        ]
      }
    });

    if (existingRequest) {
      return res.status(400).json({ error: 'Friend request already exists', status: existingRequest.status });
    }

    const request = await prisma.friendRequest.create({
      data: {
        senderId,
        receiverId: receiver.id,
        status: 'PENDING'
      }
    });

    // Create a notification for the receiver
    await prisma.notification.create({
      data: {
        userId: receiver.id,
        type: 'FRIEND_REQUEST',
        title: 'New Friend Request',
        body: `New request from @${sender.username}`,
        isRead: false
      }
    });

    res.status(201).json({ friendship: { id: request.id, status: 'PENDING' }, receiver: await formatUserAsync(receiver) });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// POST /api/friends/accept
app.post('/api/friends/accept', async (req: Request, res: Response): Promise<any> => {
  const { friendshipId } = req.body;
  if (!friendshipId) {
    return res.status(400).json({ error: 'Friendship ID is required' });
  }

  try {
    const request = await prisma.friendRequest.findUnique({
      where: { id: friendshipId }
    });
    if (!request) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    await prisma.friendRequest.update({
      where: { id: friendshipId },
      data: { status: 'ACCEPTED' }
    });

    await connectUsersAsFriends(request.senderId, request.receiverId);

    // Create a notification for the sender
    await prisma.notification.create({
      data: {
        userId: request.senderId,
        type: 'INVITE_ACCEPTED',
        title: 'Request Accepted',
        body: 'Your friend request has been accepted!',
        isRead: false
      }
    });

    res.json({ friendship: { id: request.id, status: 'ACCEPTED' } });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// GET /api/friends
app.get('/api/friends', async (req: Request, res: Response): Promise<any> => {
  const { userId } = req.query;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // 1. Fetch accepted friends (relying on reciprocal records in the friend table)
    const activeFriends = await prisma.friend.findMany({
      where: {
        userId
      },
      include: {
        friend: true
      }
    });

    // 2. Fetch pending requests
    const pendingRequests = await prisma.friendRequest.findMany({
      where: {
        OR: [
          { senderId: userId, status: 'PENDING' },
          { receiverId: userId, status: 'PENDING' }
        ]
      },
      include: {
        sender: true,
        receiver: true
      }
    });

    const formattedFriends = activeFriends.map(f => {
      const friendUser = f.friend;
      return {
        friendshipId: f.id,
        friendId: friendUser.id,
        username: friendUser.username,
        name: friendUser.name,
        avatarUrl: friendUser.profileImageUrl || null,
        status: 'ACCEPTED',
        isOutgoing: false
      };
    });

    const formattedRequests = formattedRequestsForList(pendingRequests, userId);

    res.json({ friends: [...formattedFriends, ...formattedRequests] });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

function formattedRequestsForList(requests: any[], userId: string) {
  return requests.map(r => {
    const isSender = r.senderId === userId;
    const friendUser = isSender ? r.receiver : r.sender;
    return {
      friendshipId: r.id,
      friendId: friendUser.id,
      username: friendUser.username,
      name: friendUser.name,
      avatarUrl: friendUser.profileImageUrl || null,
      status: 'PENDING',
      isOutgoing: isSender
    };
  });
}

// -----------------------------------------------------------------------------
// Private Circles Endpoints
// -----------------------------------------------------------------------------

// POST /api/circles
app.post('/api/circles', async (req: Request, res: Response): Promise<any> => {
  const { ownerId, circleName } = req.body;
  if (!ownerId || !circleName) {
    return res.status(400).json({ error: 'Owner ID and circle name are required' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: ownerId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const circle = await prisma.circle.create({
      data: {
        ownerId,
        name: circleName
      }
    });

    await prisma.circleMember.create({
      data: {
        circleId: circle.id,
        userId: ownerId,
        role: 'OWNER'
      }
    });

    const fetchedCircle = await prisma.circle.findUnique({
      where: { id: circle.id },
      include: {
        owner: true,
        members: { include: { user: true } }
      }
    });

    res.status(201).json({ circle: formatCircle(fetchedCircle) });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error creating circle' });
  }
});

// POST /api/circles/member
app.post('/api/circles/member', async (req: Request, res: Response): Promise<any> => {
  const { circleId, userId } = req.body;
  if (!circleId || !userId) {
    return res.status(400).json({ error: 'Circle ID and User ID are required' });
  }

  try {
    const circle = await prisma.circle.findUnique({
      where: { id: circleId },
      include: { owner: true, members: true }
    });
    if (!circle) {
      return res.status(404).json({ error: 'Circle not found' });
    }

    const sub = await prisma.subscription.findFirst({
      where: { userId: circle.ownerId, status: 'ACTIVE' }
    });
    const limit = sub && sub.planName === 'PREMIUM' ? 30 : 10;
    if (circle.members.length >= limit) {
      return res.status(400).json({
        error: `Circle member limit reached (${limit} for plan).`
      });
    }

    const existing = await prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } }
    });
    if (existing) {
      return res.status(400).json({ error: 'User is already a member of this circle' });
    }

    const member = await prisma.circleMember.create({
      data: { circleId, userId, role: 'MEMBER' }
    });

    res.status(201).json({ member });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// GET /api/circles
app.get('/api/circles', async (req: Request, res: Response): Promise<any> => {
  const { userId } = req.query;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const circleMemberships = await prisma.circleMember.findMany({
      where: { userId },
      include: {
        circle: {
          include: {
            owner: true,
            members: {
              include: { user: true }
            }
          }
        }
      }
    });

    const circles = circleMemberships.map(cm => formatCircle(cm.circle));
    res.json({ circles });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// -----------------------------------------------------------------------------
// Moments Endpoints
// -----------------------------------------------------------------------------

// POST /api/moments/upload
app.post('/api/moments/upload', async (req: Request, res: Response): Promise<any> => {
  const { senderId, circleId, photoUrl, caption } = req.body;
  if (!senderId || !circleId || !photoUrl) {
    return res.status(400).json({ error: 'Sender ID, Circle ID, and Photo URL are required' });
  }

  try {
    const moment = await prisma.moment.create({
      data: {
        senderId,
        circleId,
        imageUrl: photoUrl,
        caption,
        visibility: 'PRIVATE'
      },
      include: {
        circle: {
          include: {
            members: {
              include: {
                user: {
                  include: { devices: true }
                }
              }
            }
          }
        },
        sender: true
      }
    });

    const membersToNotify = moment.circle.members.filter(m => m.userId !== senderId);
    for (const member of membersToNotify) {
      await prisma.momentReceiver.create({
        data: {
          momentId: moment.id,
          receiverId: member.userId,
          viewed: false
        }
      });

      await prisma.notification.create({
        data: {
          userId: member.userId,
          type: 'NEW_MOMENT',
          title: 'New Moment',
          body: `${moment.sender.username} shared a new moment!`,
          isRead: false
        }
      });

      const tokens = member.user.devices.map(d => d.fcmToken).filter(Boolean);
      for (const token of tokens) {
        console.log(`[Push Notification] Sent to ${member.user.username} (${token}): "${moment.sender.username} shared a new moment in ${moment.circle.name}!"`);
      }
    }

    const freshMoment = await prisma.moment.findUnique({
      where: { id: moment.id },
      include: {
        sender: true,
        circle: {
          include: {
            owner: true,
            members: { include: { user: true } }
          }
        },
        reactions: { include: { user: true } }
      }
    });

    res.status(201).json({ moment: formatMoment(freshMoment) });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error uploading moment' });
  }
});

// GET /api/moments/feed
app.get('/api/moments/feed', async (req: Request, res: Response): Promise<any> => {
  const { userId } = req.query;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const memberships = await prisma.circleMember.findMany({
      where: { userId },
      select: { circleId: true }
    });

    const circleIds = memberships.map(m => m.circleId);

    const moments = await prisma.moment.findMany({
      where: {
        circleId: { in: circleIds }
      },
      include: {
        sender: true,
        circle: {
          include: {
            owner: true,
            members: { include: { user: true } }
          }
        },
        reactions: {
          include: {
            user: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ moments: moments.map(formatMoment) });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error loading feed' });
  }
});

// DELETE /api/moments/{id}
app.delete('/api/moments/:id', async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const { userId } = req.body;

  try {
    const moment = await prisma.moment.findUnique({ where: { id: id as string } });
    if (!moment) {
      return res.status(404).json({ error: 'Moment not found' });
    }

    if (moment.senderId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this moment' });
    }

    await prisma.moment.delete({ where: { id: id as string } });
    res.json({ success: true, message: 'Moment deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error deleting moment' });
  }
});

// -----------------------------------------------------------------------------
// Reactions Endpoints
// -----------------------------------------------------------------------------

// POST /api/reactions
app.post('/api/reactions', async (req: Request, res: Response): Promise<any> => {
  const { momentId, userId, emoji } = req.body;
  if (!momentId || !userId || !emoji) {
    return res.status(400).json({ error: 'Moment ID, User ID, and emoji are required' });
  }

  try {
    const reaction = await prisma.reaction.upsert({
      where: {
        momentId_userId_emoji: {
          momentId,
          userId,
          emoji
        }
      },
      update: {},
      create: {
        momentId,
        userId,
        emoji
      }
    });

    const moment = await prisma.moment.findUnique({ where: { id: momentId } });
    if (moment && moment.senderId !== userId) {
      await prisma.notification.create({
        data: {
          userId: moment.senderId,
          type: 'REACTION',
          title: 'New Reaction',
          body: `Someone reacted to your moment with ${emoji}`,
          isRead: false
        }
      });
    }

    res.status(201).json({ reaction });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error reacting to moment' });
  }
});

// GET /api/reactions/{momentId}
app.get('/api/reactions/:momentId', async (req: Request, res: Response): Promise<any> => {
  const { momentId } = req.params;

  try {
    const reactions = await prisma.reaction.findMany({
      where: { momentId: momentId as string },
      include: {
        user: true
      }
    });

    const formattedReactions = reactions.map(r => ({
      id: r.id,
      momentId: r.momentId,
      userId: r.userId,
      emoji: r.emoji,
      createdAt: r.createdAt,
      user: {
        id: r.user.id,
        username: r.user.username,
        avatarUrl: r.user.profileImageUrl || null
      }
    }));

    res.json({ reactions: formattedReactions });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error loading reactions' });
  }
});

// -----------------------------------------------------------------------------
// Viral Invitation Endpoints
// -----------------------------------------------------------------------------

// POST /api/invites/create
app.post('/api/invites/create', async (req: Request, res: Response): Promise<any> => {
  const { inviterId, platform } = req.body;
  if (!inviterId) {
    return res.status(400).json({ error: 'Inviter ID is required' });
  }

  try {
    const inviteCode = generateInviteCode();
    const inviteLink = `https://moment-x8we.onrender.com/invite/${inviteCode}`;

    const invitation = await prisma.invitation.create({
      data: {
        inviterId,
        inviteCode,
        inviteLink,
        platform: platform || 'copy'
      }
    });

    res.status(201).json({ inviteCode, inviteLink, invitation });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error generating invitation' });
  }
});

// GET /invite/:inviteCode
app.get('/invite/:inviteCode', async (req: Request, res: Response): Promise<any> => {
  const inviteCode = req.params.inviteCode;
  if (!inviteCode || typeof inviteCode !== 'string') {
    return res.status(400).send('Invite code is required');
  }

  try {
    // Track the click event
    const invite = (await prisma.invitation.findUnique({
      where: { inviteCode },
      include: { inviter: true }
    })) as any;

    if (invite) {
      // Increment clickCount
      await prisma.invitation.update({
        where: { inviteCode },
        data: { clickCount: { increment: 1 } }
      });

      // Record the click event
      await prisma.invitationEvent.create({
        data: {
          invitationId: invite.id,
          eventType: 'CLICK'
        }
      });
    }

    const inviterName = invite?.inviter?.name || invite?.inviter?.username || "A friend";

    // Serve a beautifully-styled premium HTML download page
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Join Moments</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background-color: #0A0A0C;
      color: #F3F4F6;
      font-family: 'Outfit', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
      overflow-x: hidden;
    }
    .container {
      max-width: 440px;
      width: 100%;
      text-align: center;
      background: rgba(18, 18, 22, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      padding: 40px 32px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(20px);
      animation: fadeIn 0.8s ease-out;
      position: relative;
    }
    .container::before {
      content: '';
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      background: linear-gradient(135deg, #FF8A00, #FF007A);
      border-radius: 26px;
      z-index: -1;
      opacity: 0.15;
    }
    .glow-bg {
      position: absolute;
      width: 250px;
      height: 250px;
      background: radial-gradient(circle, rgba(255, 138, 0, 0.15) 0%, rgba(255, 0, 122, 0) 70%);
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: -2;
      pointer-events: none;
    }
    .logo {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -1px;
      background: linear-gradient(90deg, #FF8A00, #FF007A);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 12px;
      line-height: 1.25;
    }
    .subtitle {
      font-size: 16px;
      color: #9CA3AF;
      margin-bottom: 32px;
      line-height: 1.5;
    }
    .btn {
      display: inline-block;
      width: 100%;
      padding: 16px;
      background: linear-gradient(90deg, #FF8A00, #FF007A);
      color: #FFFFFF;
      font-weight: 600;
      font-size: 16px;
      text-decoration: none;
      border-radius: 14px;
      transition: all 0.3s ease;
      box-shadow: 0 4px 20px rgba(255, 0, 122, 0.3);
      margin-bottom: 32px;
      border: none;
      text-align: center;
      cursor: pointer;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(255, 0, 122, 0.5);
    }
    .btn:active {
      transform: translateY(0);
    }
    .code-card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px dashed rgba(255, 255, 255, 0.15);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 32px;
    }
    .code-title {
      font-size: 12px;
      color: #9CA3AF;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 8px;
      font-weight: 600;
    }
    .code-value {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: 2px;
      color: #FFFFFF;
      margin-bottom: 12px;
    }
    .copy-btn {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #F3F4F6;
      padding: 6px 16px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .copy-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.3);
    }
    .steps {
      text-align: left;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 16px;
      padding: 20px;
      border: 1px solid rgba(255, 255, 255, 0.04);
    }
    .steps-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      color: #F3F4F6;
    }
    .step {
      font-size: 13px;
      color: #9CA3AF;
      margin-bottom: 8px;
      display: flex;
      align-items: flex-start;
      line-height: 1.4;
    }
    .step:last-child {
      margin-bottom: 0;
    }
    .step-num {
      color: #FF8A00;
      font-weight: 600;
      margin-right: 8px;
      flex-shrink: 0;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    /* Toast styles */
    .toast {
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: #18181B;
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #FFFFFF;
      padding: 12px 24px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      z-index: 1000;
      pointer-events: none;
    }
    .toast.show {
      transform: translateX(-50%) translateY(0);
    }
  </style>
</head>
<body>
  <div class="glow-bg"></div>
  <div class="container">
    <div class="logo">Moments</div>
    <h1>You've been invited!</h1>
    <p class="subtitle">Join <strong>${inviterName}</strong> on Moments to share photos directly onto each other's home screens.</p>
    
    <a href="https://expo.dev/artifacts/eas/jfKYjssya6J1u9qfZeAAuo.apk" class="btn">Download Moments for Android</a>
    
    <div class="code-card">
      <div class="code-title">Your Invite Code</div>
      <div class="code-value" id="invite-code">${inviteCode}</div>
      <button class="copy-btn" onclick="copyCode()">Copy Code</button>
    </div>
    
    <div class="steps">
      <div class="steps-title">How to join:</div>
      <div class="step">
        <span class="step-num">1.</span>
        <span>Click the button above to download the APK.</span>
      </div>
      <div class="step">
        <span class="step-num">2.</span>
        <span>Open the downloaded file and install the app.</span>
      </div>
      <div class="step">
        <span class="step-num">3.</span>
        <span>During registration, paste the copied **Invite Code** to instantly link up!</span>
      </div>
    </div>
  </div>

  <div id="toast" class="toast">Code copied to clipboard!</div>

  <script>
    function copyCode() {
      var codeText = document.getElementById('invite-code').innerText;
      navigator.clipboard.writeText(codeText).then(function() {
        showToast();
      }, function(err) {
        var textarea = document.createElement('textarea');
        textarea.value = codeText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast();
      });
    }

    function showToast() {
      var toast = document.getElementById('toast');
      toast.classList.add('show');
      setTimeout(function() {
        toast.classList.remove('show');
      }, 2500);
    }
  </script>
</body>
</html>
    `;
    res.send(htmlContent);
  } catch (error: any) {
    res.status(500).send('Error loading invitation details: ' + error.message);
  }
});

// POST /api/invites/click
app.post('/api/invites/click', async (req: Request, res: Response): Promise<any> => {
  const { inviteCode } = req.body;
  if (!inviteCode) {
    return res.status(400).json({ error: 'Invite code is required' });
  }

  try {
    const invite = await prisma.invitation.update({
      where: { inviteCode },
      data: {
        clickCount: { increment: 1 }
      }
    });

    await prisma.invitationEvent.create({
      data: {
        invitationId: invite.id,
        eventType: 'CLICK'
      }
    });

    res.json({ success: true, message: 'Click tracked successfully', invite });
  } catch (error: any) {
    res.status(404).json({ error: 'Invitation code not found' });
  }
});

// POST /api/invites/install
app.post('/api/invites/install', async (req: Request, res: Response): Promise<any> => {
  const { inviteCode } = req.body;
  if (!inviteCode) {
    return res.status(400).json({ error: 'Invite code is required' });
  }

  try {
    const invite = await prisma.invitation.update({
      where: { inviteCode },
      data: {
        installCount: { increment: 1 }
      }
    });

    await prisma.invitationEvent.create({
      data: {
        invitationId: invite.id,
        eventType: 'INSTALL'
      }
    });

    res.json({ success: true, message: 'Install tracked successfully', invite });
  } catch (error: any) {
    res.status(404).json({ error: 'Invitation code not found' });
  }
});

// POST /api/invites/accept
app.post('/api/invites/accept', async (req: Request, res: Response): Promise<any> => {
  const { inviteCode, inviteeId } = req.body;
  if (!inviteCode || !inviteeId) {
    return res.status(400).json({ error: 'Invite code and invitee ID are required' });
  }

  try {
    await handleReferralIfProvided(inviteCode, inviteeId);
    res.json({ success: true, message: 'Invitation accepted and pairing complete' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to accept invitation' });
  }
});

// -----------------------------------------------------------------------------
// Server Initialization
// -----------------------------------------------------------------------------

const PORT = process.env.PORT || 3000;
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`[Moments Backend] Running on port ${PORT}`);
});

