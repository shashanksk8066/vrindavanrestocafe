const { db } = require('../config/firebaseAdmin');

// Helper for generic CRUD operations
const getItems = async (collectionName, req, res) => {
    try {
        const { status } = req.query;
        let query = db.collection(collectionName);
        if (status) query = query.where('status', '==', status);

        const snapshot = await query.get();
        const items = [];
        snapshot.forEach(doc => items.push(doc.data()));

        res.status(200).json({ success: true, data: items });
    } catch (error) {
        console.error(`Get ${collectionName} Error:`, error);
        res.status(500).json({ success: false, message: 'Failed to fetch items' });
    }
};

const createItem = async (collectionName, req, res) => {
    try {
        const data = req.body;
        const ref = db.collection(collectionName).doc();
        await ref.set({
            ...data,
            id: ref.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        res.status(201).json({ success: true, message: 'Item created successfully', id: ref.id });
    } catch (error) {
        console.error(`Create ${collectionName} Error:`, error);
        res.status(500).json({ success: false, message: 'Failed to create item' });
    }
};

const updateItem = async (collectionName, req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        updates.updatedAt = new Date().toISOString();

        await db.collection(collectionName).doc(id).update(updates);
        res.status(200).json({ success: true, message: 'Item updated successfully' });
    } catch (error) {
        console.error(`Update ${collectionName} Error:`, error);
        res.status(500).json({ success: false, message: 'Failed to update item' });
    }
};

const deleteItem = async (collectionName, req, res) => {
    try {
        const { id } = req.params;
        await db.collection(collectionName).doc(id).delete();
        res.status(200).json({ success: true, message: 'Item deleted successfully' });
    } catch (error) {
        console.error(`Delete ${collectionName} Error:`, error);
        res.status(500).json({ success: false, message: 'Failed to delete item' });
    }
};

// Subscription Menu specific handlers
const getSubscriptionMenu = (req, res) => getItems('subscriptionMenu', req, res);
const createSubscriptionMenu = (req, res) => createItem('subscriptionMenu', req, res);
const updateSubscriptionMenu = (req, res) => updateItem('subscriptionMenu', req, res);
const deleteSubscriptionMenu = (req, res) => deleteItem('subscriptionMenu', req, res);

// Main Menu specific handlers
const getMainMenu = (req, res) => getItems('mainMenu', req, res);
const createMainMenu = (req, res) => createItem('mainMenu', req, res);
const updateMainMenu = (req, res) => updateItem('mainMenu', req, res);
const deleteMainMenu = (req, res) => deleteItem('mainMenu', req, res);

module.exports = {
    getSubscriptionMenu, createSubscriptionMenu, updateSubscriptionMenu, deleteSubscriptionMenu,
    getMainMenu, createMainMenu, updateMainMenu, deleteMainMenu
};
