export const uploadImage = async (file, folder = 'reviews') => {
    if (!file) return null;
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        // Adjust port if your backend runs on a different port (e.g. 5050)
        const response = await fetch(`http://localhost:5050/api/upload/review-image`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (data.success) {
            let url = data.url;
            // Handle ngrok workaround just like Menus.jsx does
            if (url && url.includes('ngrok-free.app')) {
                url = url.replace(/https:\/\/.*\.ngrok-free\.app/, 'http://localhost:5050');
            }
            return url;
        } else {
            console.error("Backend error uploading image:", data.message);
            throw new Error(data.message || "Failed to upload image");
        }
    } catch (error) {
        console.error("Error uploading image:", error);
        throw error;
    }
};
