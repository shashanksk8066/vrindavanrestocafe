const admin = require("firebase-admin");

// By leaving this empty, it automatically uses your personal CLI login!
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: "vrindavan-9a9aa"
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

            for (const key in newData) {
                if (typeof newData[key] === 'string') {
                    if (newData[key].includes(':5050') || newData[key].includes('localhost') || newData[key].includes('.ngrok-free.app')) {
                        let fixedUrl = newData[key].replace(/https?:\/\/[^\/]+(?::\d+)?\/public\/uploads\//g, '/api/uploads/');
                        fixedUrl = fixedUrl.replace(/https?:\/\/[^\/]+(?::\d+)?\/uploads\//g, '/api/uploads/');
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
    
    console.log("Checking for array fields...");
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

fixUrls().catch(err => {
    console.error("\nCRITICAL FAILURE:", err.message);
    process.exit(1);
});
