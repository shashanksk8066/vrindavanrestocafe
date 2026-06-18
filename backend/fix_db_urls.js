const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const fixUrls = async () => {
    const collectionsToFix = ['menu', 'categories', 'subscriptionPlans', 'appSettings', 'gallery'];

    for (const colName of collectionsToFix) {
        console.log(`Checking collection: ${colName}`);
        const snapshot = await db.collection(colName).get();
        
        let batch = db.batch();
        let count = 0;

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            let updated = false;
            let newData = { ...data };

            // Find all string fields that look like the bad URLs
            for (const key in newData) {
                if (typeof newData[key] === 'string') {
                    if (newData[key].includes(':5050') || newData[key].includes('localhost') || newData[key].includes('.ngrok-free.app')) {
                        // Replace the entire domain and /public/ prefix with /api/
                        let fixedUrl = newData[key].replace(/https?:\/\/[^\/]+(?::\d+)?\/public\/uploads\//g, '/api/uploads/');
                        // Also handle if they don't have /public/
                        fixedUrl = fixedUrl.replace(/https?:\/\/[^\/]+(?::\d+)?\/uploads\//g, '/api/uploads/');
                        // Also handle if it is just localhost without /public
                        fixedUrl = fixedUrl.replace(/https?:\/\/[^\/]+(?::\d+)?\/api\/uploads\//g, '/api/uploads/');

                        newData[key] = fixedUrl;
                        updated = true;
                    }
                }
            }

            if (updated) {
                batch.update(doc.ref, newData);
                count++;
                console.log(`Updated doc ${doc.id} in ${colName}`);
                
                if (count >= 400) {
                    // Firestore batch limit is 500
                    batch.commit();
                    batch = db.batch();
                    count = 0;
                }
            }
        });

        if (count > 0) {
            await batch.commit();
        }
    }
    
    // Fix array fields (like gallery images)
    console.log("Checking for array fields...");
    // Special handling for appSettings banner/gallery if they are arrays
    const settingsDoc = await db.collection('appSettings').doc('homepage').get();
    if (settingsDoc.exists) {
        let data = settingsDoc.data();
        let updated = false;
        
        if (data.banners && Array.isArray(data.banners)) {
            data.banners = data.banners.map(b => {
                if (b.imageUrl && (b.imageUrl.includes(':5050') || b.imageUrl.includes('localhost') || b.imageUrl.includes('ngrok'))) {
                    updated = true;
                    return { ...b, imageUrl: b.imageUrl.replace(/https?:\/\/[^\/]+(?::\d+)?\/(?:public\/)?uploads\//g, '/api/uploads/') };
                }
                return b;
            });
        }
        
        if (updated) {
            await db.collection('appSettings').doc('homepage').update(data);
            console.log("Updated appSettings homepage arrays");
        }
    }

    console.log("Done fixing database URLs!");
    process.exit(0);
};

fixUrls().catch(console.error);
