import axios from 'axios';
import cheerio from 'cheerio';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { storeUrl } = req.body;

  if (!storeUrl) {
    return res.status(400).json({ error: 'Store URL is required' });
  }

  try {
    // Initialize data object
    const storeData = {
      products: [],
      collections: [],
      blogs: [],
      articles: [],
      storeInfo: {}
    };

    // Fetch store information first to validate it's a Shopify store
    const storeInfo = await fetchStoreInfo(storeUrl);
    storeData.storeInfo = storeInfo;

    // Fetch products
    const products = await fetchProducts(storeUrl);
    storeData.products = products;

    // Fetch collections
    const collections = await fetchCollections(storeUrl);
    storeData.collections = collections;

    // Fetch blogs and articles
    const blogs = await fetchBlogs(storeUrl);
    storeData.blogs = blogs;

    // For each blog, fetch its articles
    for (const blog of blogs) {
      const articles = await fetchArticles(storeUrl, blog.handle);
      blog.articles = articles;
      // Add articles to the main articles array as well
      storeData.articles = [...storeData.articles, ...articles];
    }

    return res.status(200).json(storeData);
  } catch (error) {
    console.error('Scraping error:', error);
    return res.status(500).json({ 
      error: 'Failed to scrape the store data',
      details: error.message
    });
  }
}

async function fetchStoreInfo(storeUrl) {
  try {
    // Make a request to the store homepage
    const response = await axios.get(storeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);
    
    // Initialize store info object
    const storeInfo = {
      name: '',
      logo: '',
      favicon: '',
      address: '',
      email: '',
      phone: '',
      socialLinks: {}
    };

    // Extract store name
    storeInfo.name = $('title').text().split('|')[0].trim();
    if (!storeInfo.name) {
      storeInfo.name = $('meta[property="og:site_name"]').attr('content') || '';
    }

    // Extract logo
    storeInfo.logo = $('meta[property="og:image"]').attr('content') || '';
    if (!storeInfo.logo) {
      // Try to find logo in header
      const logoImg = $('header img').first().attr('src') || '';
      if (logoImg) {
        storeInfo.logo = logoImg.startsWith('http') ? logoImg : `${storeUrl}${logoImg}`;
      }
    }

    // Extract favicon
    const faviconLink = $('link[rel="shortcut icon"], link[rel="icon"]').attr('href');
    if (faviconLink) {
      storeInfo.favicon = faviconLink.startsWith('http') ? faviconLink : `${storeUrl}${faviconLink}`;
    }

    // Extract contact information (requires some guessing as different themes place it differently)
    // Usually in the footer
    const footerText = $('footer').text();
    
    // Address: Look for patterns like a ZIP code or known words
    const addressElements = $('footer address, footer .address, footer [itemtype*="PostalAddress"]').first();
    if (addressElements.length > 0) {
      storeInfo.address = addressElements.text().trim();
    } else {
      // Try to extract address using regex patterns for postal codes or state abbreviations
      const addressRegex = /[A-Z]{2}\s+\d{5}(-\d{4})?|[A-Z][0-9][A-Z]\s*[0-9][A-Z][0-9]/;
      const potentialAddress = footerText.match(addressRegex);
      if (potentialAddress) {
        // Get a larger context around the postal code
        const addressContext = footerText.substring(
          Math.max(0, footerText.indexOf(potentialAddress[0]) - 100),
          Math.min(footerText.length, footerText.indexOf(potentialAddress[0]) + 100)
        );
        storeInfo.address = addressContext.trim();
      }
    }

    // Email
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const emailMatch = html.match(emailRegex);
    if (emailMatch) {
      storeInfo.email = emailMatch[0];
    }

    // Phone
    const phoneRegex = /\+?[0-9]{1,4}[\s-]?(\([0-9]{1,4}\)[\s-]?)?[0-9]{1,4}[\s-]?[0-9]{1,4}[\s-]?[0-9]{1,4}/;
    const phoneMatch = html.match(phoneRegex);
    if (phoneMatch) {
      storeInfo.phone = phoneMatch[0];
    }

    // Social links
    const socialPlatforms = [
      { name: 'facebook', regex: /facebook\.com\/[^"'\s]+/ },
      { name: 'instagram', regex: /instagram\.com\/[^"'\s]+/ },
      { name: 'twitter', regex: /twitter\.com\/[^"'\s]+/ },
      { name: 'pinterest', regex: /pinterest\.com\/[^"'\s]+/ },
      { name: 'youtube', regex: /youtube\.com\/[^"'\s]+/ },
      { name: 'tiktok', regex: /tiktok\.com\/@[^"'\s]+/ }
    ];

    for (const platform of socialPlatforms) {
      const match = html.match(platform.regex);
      if (match) {
        const url = match[0];
        storeInfo.socialLinks[platform.name] = url.startsWith('http') ? url : `https://${url}`;
      }
    }

    return storeInfo;
  } catch (error) {
    console.error('Error fetching store info:', error);
    // Return empty object but don't fail completely
    return {
      name: 'Unknown Store',
      logo: '',
      favicon: '',
      address: '',
      email: '',
      phone: '',
      socialLinks: {}
    };
  }
}

async function fetchProducts(storeUrl) {
  try {
    // Try to fetch all products from the products.json endpoint
    const response = await axios.get(`${storeUrl}/products.json`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (response.data && response.data.products) {
      return response.data.products;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching products:', error);
    // If the first method fails, try an alternative approach using the /collections/all.json endpoint
    try {
      const collectionResponse = await axios.get(`${storeUrl}/collections/all.json`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (collectionResponse.data && collectionResponse.data.products) {
        return collectionResponse.data.products;
      }
      
      return [];
    } catch (secondError) {
      console.error('Alternative product fetching method failed:', secondError);
      return [];
    }
  }
}

async function fetchCollections(storeUrl) {
  try {
    // Try to fetch all collections from the collections.json endpoint
    const response = await axios.get(`${storeUrl}/collections.json`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (response.data && response.data.collections) {
      const collections = response.data.collections;
      
      // For each collection, try to fetch additional details
      for (const collection of collections) {
        try {
          const detailResponse = await axios.get(`${storeUrl}/collections/${collection.handle}.json`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          
          if (detailResponse.data && detailResponse.data.collection) {
            // Merge the additional details
            Object.assign(collection, detailResponse.data.collection);
          }
        } catch (detailError) {
          console.error(`Error fetching details for collection ${collection.handle}:`, detailError);
          // Continue with the next collection
        }
      }
      
      return collections;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching collections:', error);
    
    // If collections.json fails, try to scrape collections from the HTML
    try {
      const htmlResponse = await axios.get(`${storeUrl}/collections`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      const $ = cheerio.load(htmlResponse.data);
      const collections = [];
      
      // Look for collection links - this is more of a guess as it depends on the theme
      $('a[href*="/collections/"]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && !href.includes('/products/') && !href.includes('/collections/all')) {
          const handle = href.split('/collections/')[1].split('/')[0];
          if (handle) {
            const title = $(el).text().trim();
            
            // Check if we already added this collection
            const existingCollection = collections.find(c => c.handle === handle);
            if (!existingCollection && title) {
              collections.push({
                id: `${i}`,
                handle,
                title,
                url: href.startsWith('http') ? href : `${storeUrl}${href}`
              });
            }
          }
        }
      });
      
      return collections;
    } catch (scrapeError) {
      console.error('Collection scraping failed:', scrapeError);
      return [];
    }
  }
}

async function fetchBlogs(storeUrl) {
  try {
    // Try to fetch all blogs from the blogs.json endpoint
    const response = await axios.get(`${storeUrl}/blogs.json`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (response.data && response.data.blogs) {
      return response.data.blogs;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching blogs:', error);
    
    // If blogs.json fails, try to scrape blogs from the HTML
    try {
      const htmlResponse = await axios.get(`${storeUrl}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      const $ = cheerio.load(htmlResponse.data);
      const blogs = [];
      
      // Look for blog links - this is a guess as it depends on the theme
      $('a[href*="/blogs/"]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && !href.includes('/blogs/news/tagged/')) {
          const parts = href.split('/blogs/');
          if (parts.length > 1) {
            const handle = parts[1].split('/')[0];
            if (handle) {
              const title = $(el).text().trim();
              
              // Check if we already added this blog
              const existingBlog = blogs.find(b => b.handle === handle);
              if (!existingBlog && title) {
                blogs.push({
                  id: `blog_${i}`,
                  handle,
                  title,
                  url: href.startsWith('http') ? href : `${storeUrl}${href}`
                });
              }
            }
          }
        }
      });
      
      return blogs;
    } catch (scrapeError) {
      console.error('Blog scraping failed:', scrapeError);
      return [];
    }
  }
}

async function fetchArticles(storeUrl, blogHandle) {
  try {
    // Try to fetch all articles from the blogs/[handle]/articles.json endpoint
    const response = await axios.get(`${storeUrl}/blogs/${blogHandle}/articles.json`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (response.data && response.data.articles) {
      const articles = response.data.articles;
      
      // Process each article to extract a summary
      for (const article of articles) {
        if (article.content) {
          // Use Cheerio to parse HTML content and extract text
          const $ = cheerio.load(article.content);
          article.summary = $('p').first().text().trim().substring(0, 200) + '...';
          
          // Remove the full content to reduce payload size
          delete article.content;
        }
      }
      
      return articles;
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching articles for blog ${blogHandle}:`, error);
    return [];
  }
}
