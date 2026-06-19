export const generateLocalBusinessSchema = () => {
    return {
        "@context": "https://schema.org",
        "@type": ["Restaurant", "LocalBusiness"],
        "name": "Vrindavan Resto Cafe",
        "image": "https://vrindavanrestocafe.com/logo.png",
        "url": "https://vrindavanrestocafe.com",
        "telephone": "+917813041177",
        "priceRange": "₹₹",
        "address": {
            "@type": "PostalAddress",
            "streetAddress": "No 93 M.V.P Layout Acharya College Road Soladevanahalli",
            "addressLocality": "Bangalore North, Bangalore Urban",
            "addressRegion": "Karnataka",
            "postalCode": "560107",
            "addressCountry": "IN"
        },
        "geo": {
            "@type": "GeoCoordinates",
            "latitude": 13.0847, // Approximated coordinate for Soladevanahalli
            "longitude": 77.4848 
        },
        "openingHoursSpecification": [
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
                "opens": "07:00",
                "closes": "22:00"
            }
        ],
        "servesCuisine": ["South Indian", "North Indian", "Vegetarian", "Cafe"],
        "areaServed": [
            "Solladevanahalli",
            "Acharya College",
            "Hesaraghatta",
            "Chikkabanavara",
            "Jalahalli",
            "Dasarahalli",
            "Peenya",
            "Bengaluru"
        ],
        "menu": "https://vrindavanrestocafe.com/menu",
        "acceptsReservations": "True"
    };
};

export const generateOrganizationSchema = () => {
    return {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Vrindavan Resto Cafe",
        "url": "https://vrindavanrestocafe.com",
        "logo": "https://vrindavanrestocafe.com/logo.png",
        "contactPoint": {
            "@type": "ContactPoint",
            "telephone": "+917813041177",
            "contactType": "customer service"
        },
        "sameAs": [
            "https://www.instagram.com/vrindavan.resto.cafe"
        ]
    };
};

export const generateBreadcrumbSchema = (crumbs) => {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": crumbs.map((crumb, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": crumb.name,
            "item": crumb.url
        }))
    };
};

export const generateMenuSchema = (items) => {
    return {
        "@context": "https://schema.org",
        "@type": "Menu",
        "name": "Vrindavan Resto Cafe Menu",
        "mainEntityOfPage": "https://vrindavanrestocafe.com/menu",
        "hasMenuSection": [
            {
                "@type": "MenuSection",
                "name": "Popular Dishes",
                "hasMenuItem": items.map(item => ({
                    "@type": "MenuItem",
                    "name": item.name,
                    "description": item.description,
                    "offers": {
                        "@type": "Offer",
                        "price": item.price,
                        "priceCurrency": "INR"
                    }
                }))
            }
        ]
    };
};
