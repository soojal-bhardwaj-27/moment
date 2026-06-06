import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), senderName: "No moments yet", photoUrl: "")
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = SimpleEntry(date: Date(), senderName: "Alex", photoUrl: "")
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        // Read from shared AppGroup userDefaults
        let userDefaults = UserDefaults(suiteName: "group.com.soojal-bhardwaj-27.locketclone")
        let senderName = userDefaults?.string(forKey: "senderName") ?? "No moments yet"
        let photoUrl = userDefaults?.string(forKey: "photoUrl") ?? ""
        
        let entry = SimpleEntry(date: Date(), senderName: senderName, photoUrl: photoUrl)
        
        // Refresh policy: refresh after 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let senderName: String
    let photoUrl: String
}

struct MomentsWidgetEntryView : View {
    var entry: Provider.Entry

    var body: some View {
        GeometryReader { geo in
            ZStack {
                Color.black
                
                if !entry.photoUrl.isEmpty, let url = URL(string: entry.photoUrl), let data = try? Data(contentsOf: url), let uiImage = UIImage(data: data) {
                    Image(uiImage: uiImage)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: geo.size.width, height: geo.size.height)
                        .clipped()
                } else {
                    VStack(spacing: 8) {
                        Text("📸")
                            .font(.system(size: 30))
                        Text("No Moments")
                            .foregroundColor(.white)
                            .font(.system(size: 14, weight: .bold))
                    }
                }
                
                // Overlay text
                VStack {
                    Spacer()
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(entry.senderName)
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.white)
                            Text("SB Moments")
                                .font(.system(size: 9))
                                .foregroundColor(.gray)
                        }
                        Spacer()
                    }
                    .padding(8)
                    .background(Color.black.opacity(0.6))
                }
            }
        }
    }
}

@main
struct MomentsWidget: Widget {
    let kind: String = "MomentsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            MomentsWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Moments Widget")
        .description("Instantly see live moments shared by your friends.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
