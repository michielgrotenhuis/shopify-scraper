import { useState, useEffect } from 'react';
import Head from 'next/head';
import axios from 'axios';

export default function Home() {
  const [storeUrl, setStoreUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [storeData, setStoreData] = useState(null);
  const [activeTab, setActiveTab] = useState('products');
  const [totalItems, setTotalItems] = useState(0);
  const [downloadReady, setDownloadReady] = useState(false);

  const fetchData = async () => {
    if (!storeUrl) {
      setError('Please enter a valid Shopify store URL');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setStoreData(null);
      setDownloadReady(false);

      // Normalize the URL
      let normalizedUrl = storeUrl;
      if (!normalizedUrl.startsWith('http')) {
        normalizedUrl = `https://${normalizedUrl}`;
      }
      
      // Remove trailing slash if present
      normalizedUrl = normalizedUrl.replace(/\/$/, '');

      // Use the API routes we'll create
      const response = await axios.post('/api/scrape', { 
        storeUrl: normalizedUrl 
      });

      setStoreData(response.data);
      setTotalItems(
        (response.data.products?.length || 0) + 
        (response.data.collections?.length || 0) + 
        (response.data.blogs?.length || 0) + 
        (response.data.articles?.length || 0)
      );
      setDownloadReady(true);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.error || 'Failed to fetch data from the store.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!storeData) return;

    const jsonString = JSON.stringify(storeData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${storeUrl.replace(/[^a-zA-Z0-9]/g, '_')}_data.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Shopify Store Scraper</title>
        <meta name="description" content="Scrape data from Shopify stores for import" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8 text-indigo-700">
          Shopify Store Scraper
        </h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              value={storeUrl}
              onChange={(e) => setStoreUrl(e.target.value)}
              placeholder="Enter Shopify store URL (e.g., store.myshopify.com or custom domain)"
              className="flex-grow p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={fetchData}
              disabled={loading || !storeUrl}
              className={`py-3 px-6 rounded-lg text-white font-medium ${
                loading || !storeUrl
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {loading ? 'Scraping...' : 'Scrape Store'}
            </button>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Scraping store data. This may take a few moments...</p>
          </div>
        )}

        {storeData && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex overflow-x-auto">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`px-4 py-3 font-medium whitespace-nowrap ${
                    activeTab === 'summary'
                      ? 'border-b-2 border-indigo-500 text-indigo-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setActiveTab('products')}
                  className={`px-4 py-3 font-medium whitespace-nowrap ${
                    activeTab === 'products'
                      ? 'border-b-2 border-indigo-500 text-indigo-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Products ({storeData.products?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('collections')}
                  className={`px-4 py-3 font-medium whitespace-nowrap ${
                    activeTab === 'collections'
                      ? 'border-b-2 border-indigo-500 text-indigo-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Collections ({storeData.collections?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('blogs')}
                  className={`px-4 py-3 font-medium whitespace-nowrap ${
                    activeTab === 'blogs'
                      ? 'border-b-2 border-indigo-500 text-indigo-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Blogs & Articles ({storeData.blogs?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('storeinfo')}
                  className={`px-4 py-3 font-medium whitespace-nowrap ${
                    activeTab === 'storeinfo'
                      ? 'border-b-2 border-indigo-500 text-indigo-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Store Info
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'summary' && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Store Summary</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-indigo-50 p-4 rounded-lg">
                      <p className="text-indigo-700 font-semibold">Products</p>
                      <p className="text-2xl font-bold">{storeData.products?.length || 0}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-green-700 font-semibold">Collections</p>
                      <p className="text-2xl font-bold">{storeData.collections?.length || 0}</p>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <p className="text-yellow-700 font-semibold">Blogs</p>
                      <p className="text-2xl font-bold">{storeData.blogs?.length || 0}</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-blue-700 font-semibold">Articles</p>
                      <p className="text-2xl font-bold">{storeData.articles?.length || 0}</p>
                    </div>
                  </div>
                  {storeData.storeInfo && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-2">Store Information</h3>
                      <div className="flex items-center space-x-4 mb-4">
                        {storeData.storeInfo.logo && (
                          <img 
                            src={storeData.storeInfo.logo} 
                            alt="Store Logo" 
                            className="h-16 w-auto"
                          />
                        )}
                        <div>
                          <p className="font-medium">{storeData.storeInfo.name || 'Store Name Not Found'}</p>
                          {storeData.storeInfo.address && (
                            <p className="text-sm text-gray-600">{storeData.storeInfo.address}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="mt-6">
                    <button
                      onClick={handleDownload}
                      disabled={!downloadReady}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                    >
                      Download Complete Dataset (JSON)
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'products' && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Products</h2>
                  {storeData.products && storeData.products.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Handle</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variants</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {storeData.products.map((product) => (
                            <tr key={product.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {product.image ? (
                                  <img
                                    src={product.image.src}
                                    alt={product.title}
                                    className="h-10 w-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                    <span className="text-xs text-gray-500">No img</span>
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {product.title}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {product.handle}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {product.variants && product.variants.length > 0
                                  ? `$${parseFloat(product.variants[0].price).toFixed(2)}`
                                  : 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {product.variants ? product.variants.length : 0}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500">No products found.</p>
                  )}
                </div>
              )}

              {activeTab === 'collections' && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Collections</h2>
                  {storeData.collections && storeData.collections.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {storeData.collections.map((collection) => (
                        <div key={collection.id} className="border rounded-lg overflow-hidden">
                          {collection.image ? (
                            <img
                              src={collection.image.src}
                              alt={collection.title}
                              className="w-full h-48 object-cover"
                            />
                          ) : (
                            <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-500">No image available</span>
                            </div>
                          )}
                          <div className="p-4">
                            <h3 className="font-semibold text-lg">{collection.title}</h3>
                            {collection.description && (
                              <p className="text-gray-600 mt-2 text-sm line-clamp-3">
                                {collection.description}
                              </p>
                            )}
                            <p className="text-sm text-gray-500 mt-2">
                              Products: {collection.products_count || 'Unknown'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No collections found.</p>
                  )}
                </div>
              )}

              {activeTab === 'blogs' && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Blogs & Articles</h2>
                  {storeData.blogs && storeData.blogs.length > 0 ? (
                    <div>
                      {storeData.blogs.map((blog) => (
                        <div key={blog.id} className="mb-8">
                          <h3 className="text-lg font-semibold mb-2">{blog.title}</h3>
                          <p className="text-gray-600 mb-4">
                            {blog.articles_count || 0} articles
                          </p>
                          
                          {blog.articles && blog.articles.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {blog.articles.map((article) => (
                                <div key={article.id} className="border rounded-lg overflow-hidden">
                                  {article.image ? (
                                    <img
                                      src={article.image.src}
                                      alt={article.title}
                                      className="w-full h-40 object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-40 bg-gray-200 flex items-center justify-center">
                                      <span className="text-gray-500">No image</span>
                                    </div>
                                  )}
                                  <div className="p-4">
                                    <h4 className="font-medium">{article.title}</h4>
                                    <p className="text-sm text-gray-500 mt-1">
                                      {new Date(article.published_at).toLocaleDateString()}
                                    </p>
                                    {article.summary && (
                                      <p className="text-gray-600 mt-2 text-sm line-clamp-3">
                                        {article.summary}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500">No articles found for this blog.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No blogs found.</p>
                  )}
                </div>
              )}

              {activeTab === 'storeinfo' && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Store Information</h2>
                  {storeData.storeInfo ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 p-6 rounded-lg">
                        <h3 className="font-medium text-lg mb-4">Branding</h3>
                        <div className="space-y-4">
                          {storeData.storeInfo.logo && (
                            <div>
                              <p className="text-sm text-gray-500 mb-2">Logo</p>
                              <img 
                                src={storeData.storeInfo.logo} 
                                alt="Store Logo" 
                                className="h-20 w-auto"
                              />
                            </div>
                          )}
                          
                          {storeData.storeInfo.favicon && (
                            <div>
                              <p className="text-sm text-gray-500 mb-2">Favicon</p>
                              <img 
                                src={storeData.storeInfo.favicon} 
                                alt="Favicon" 
                                className="h-8 w-auto"
                              />
                            </div>
                          )}
                          
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Store Name</p>
                            <p className="font-medium">{storeData.storeInfo.name || 'Not found'}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-6 rounded-lg">
                        <h3 className="font-medium text-lg mb-4">Contact Information</h3>
                        <div className="space-y-4">
                          {storeData.storeInfo.address && (
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Address</p>
                              <p className="font-medium whitespace-pre-line">{storeData.storeInfo.address}</p>
                            </div>
                          )}
                          
                          {storeData.storeInfo.email && (
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Email</p>
                              <p className="font-medium">{storeData.storeInfo.email}</p>
                            </div>
                          )}
                          
                          {storeData.storeInfo.phone && (
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Phone</p>
                              <p className="font-medium">{storeData.storeInfo.phone}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-6 rounded-lg md:col-span-2">
                        <h3 className="font-medium text-lg mb-4">Social Media</h3>
                        {storeData.storeInfo.socialLinks && Object.keys(storeData.storeInfo.socialLinks).length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Object.entries(storeData.storeInfo.socialLinks).map(([platform, url]) => (
                              <div key={platform} className="p-3 bg-white rounded-lg shadow-sm">
                                <p className="text-sm text-gray-500 mb-1 capitalize">{platform}</p>
                                <a 
                                  href={url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline truncate block"
                                >
                                  {url}
                                </a>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500">No social media links found.</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">No store information found.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="py-6 text-center text-gray-500 text-sm">
        <p>Shopify Scraper Tool &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
