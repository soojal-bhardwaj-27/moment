const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withIosWidget(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const iosDir = path.join(projectRoot, 'ios');
      
      // Ensure target folders exist
      const targetDir = path.join(iosDir, 'MomentsWidgetExtension');
      fs.mkdirSync(targetDir, { recursive: true });
      
      try {
        // Copy MomentsWidget.swift
        fs.copyFileSync(
          path.join(projectRoot, 'native/ios/MomentsWidget.swift'),
          path.join(targetDir, 'MomentsWidget.swift')
        );

        // Create a simple Info.plist for the extension
        const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>NSExtension</key>
	<dict>
		<key>NSExtensionPointIdentifier</key>
		<string>com.apple.widgetkit-extension</string>
	</dict>
</dict>
</plist>`;
        
        fs.writeFileSync(path.join(targetDir, 'Info.plist'), plistContent);
        console.log('[Moments iOS Widget Plugin] Copied Swift widget code and created Info.plist.');
      } catch (err) {
        console.error('[Moments iOS Widget Plugin] Error copying files:', err);
      }
      
      return config;
    }
  ]);
}

module.exports = withIosWidget;
