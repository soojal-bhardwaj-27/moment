const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withAndroidWidget(config) {
  // 1. Update AndroidManifest.xml to register the MomentsWidget AppWidgetProvider
  config = withAndroidManifest(config, async (config) => {
    const mainApplication = config.modResults.manifest.application[0];
    
    if (!mainApplication.receiver) {
      mainApplication.receiver = [];
    }
    
    const hasWidgetReceiver = mainApplication.receiver.some(
      (r) => r.$['android:name'] === '.MomentsWidget'
    );
    
    if (!hasWidgetReceiver) {
      mainApplication.receiver.push({
        $: {
          'android:name': '.MomentsWidget',
          'android:exported': 'false',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.appwidget.action.APPWIDGET_UPDATE',
                },
              },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': '@xml/widget_info',
            },
          },
        ],
      });
    }
    
    return config;
  });

  // 2. Copy native Android widget files into the prebuild Android folder
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const packagePath = 'com/soojal_bhardwaj_27/locketclone';
      
      const androidAppSrc = path.join(
        projectRoot,
        'android/app/src/main'
      );
      
      const srcDir = path.join(androidAppSrc, 'java', packagePath);
      const resDir = path.join(androidAppSrc, 'res');
      
      // Ensure target resource directories exist
      fs.mkdirSync(srcDir, { recursive: true });
      fs.mkdirSync(path.join(resDir, 'layout'), { recursive: true });
      fs.mkdirSync(path.join(resDir, 'xml'), { recursive: true });
      fs.mkdirSync(path.join(resDir, 'drawable'), { recursive: true });
      
      try {
        console.log('[Moments Android Widget Plugin] DEBUG: projectRoot is:', projectRoot);
        console.log('[Moments Android Widget Plugin] DEBUG: srcDir is:', srcDir);
        
        const sourceFile = path.join(projectRoot, 'native/android/MomentsWidget.kt');
        console.log('[Moments Android Widget Plugin] DEBUG: sourceFile path:', sourceFile);
        console.log('[Moments Android Widget Plugin] DEBUG: sourceFile exists:', fs.existsSync(sourceFile));
        
        // List contents of project root
        console.log('[Moments Android Widget Plugin] DEBUG: Listing projectRoot contents:', fs.readdirSync(projectRoot));
        
        const nativeDir = path.join(projectRoot, 'native');
        if (fs.existsSync(nativeDir)) {
          console.log('[Moments Android Widget Plugin] DEBUG: Listing native/ contents:', fs.readdirSync(nativeDir));
          const nativeAndroidDir = path.join(nativeDir, 'android');
          if (fs.existsSync(nativeAndroidDir)) {
            console.log('[Moments Android Widget Plugin] DEBUG: Listing native/android/ contents:', fs.readdirSync(nativeAndroidDir));
          } else {
            console.log('[Moments Android Widget Plugin] DEBUG: native/android does NOT exist');
          }
        } else {
          console.log('[Moments Android Widget Plugin] DEBUG: native/ does NOT exist');
        }

        // Copy MomentsWidget.kt
        fs.copyFileSync(
          sourceFile,
          path.join(srcDir, 'MomentsWidget.kt')
        );
        
        // Copy layout
        fs.copyFileSync(
          path.join(projectRoot, 'native/android/res/layout/widget_layout.xml'),
          path.join(resDir, 'layout/widget_layout.xml')
        );
        
        // Copy xml info
        fs.copyFileSync(
          path.join(projectRoot, 'native/android/res/xml/widget_info.xml'),
          path.join(resDir, 'xml/widget_info.xml')
        );
        
        // Copy drawable shape
        fs.copyFileSync(
          path.join(projectRoot, 'native/android/res/drawable/widget_background.xml'),
          path.join(resDir, 'drawable/widget_background.xml')
        );
        
        console.log('[Moments Android Widget Plugin] Successfully copied native resources to prebuild directories.');
      } catch (err) {
        console.error('[Moments Android Widget Plugin] Error copying native files:', err);
        throw err; // rethrow so that the build fails immediately with the error and we see logs
      }
      
      return config;
    },
  ]);

  return config;
}

module.exports = withAndroidWidget;
