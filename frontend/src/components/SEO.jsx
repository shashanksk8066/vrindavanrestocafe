import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({ title, description, canonical, schema, keywords }) => {
    const siteName = "Vrindavan Resto Cafe";
    const defaultDescription = "Experience the best South Indian, North Indian, and Vegetarian food at Vrindavan Resto Cafe. The best family restaurant and cafe near Acharya College, Solladevanahalli.";
    
    const pageTitle = title ? `${title} | ${siteName}` : siteName;
    const pageDescription = description || defaultDescription;
    const pageCanonical = canonical ? `https://vrindavanrestocafe.com${canonical}` : "https://vrindavanrestocafe.com";
    
    // Default optimized local keywords
    const defaultKeywords = "Vrindavan Resto Cafe, Restaurant Near Acharya College, Cafe in Solladevanahalli, Best South Indian Restaurant Near Me, Veg Restaurant, Family Restaurant";
    const pageKeywords = keywords ? `${keywords}, ${defaultKeywords}` : defaultKeywords;

    return (
        <Helmet>
            {/* Standard Meta Tags */}
            <title>{pageTitle}</title>
            <meta name="description" content={pageDescription} />
            <meta name="keywords" content={pageKeywords} />
            <link rel="canonical" href={pageCanonical} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content="website" />
            <meta property="og:url" content={pageCanonical} />
            <meta property="og:title" content={pageTitle} />
            <meta property="og:description" content={pageDescription} />
            <meta property="og:image" content="https://vrindavanrestocafe.com/logo.png" />
            <meta property="og:site_name" content={siteName} />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:url" content={pageCanonical} />
            <meta name="twitter:title" content={pageTitle} />
            <meta name="twitter:description" content={pageDescription} />
            <meta name="twitter:image" content="https://vrindavanrestocafe.com/logo.png" />

            {/* JSON-LD Schema structured data */}
            {schema && (
                <script type="application/ld+json">
                    {JSON.stringify(schema)}
                </script>
            )}
        </Helmet>
    );
};

export default SEO;
