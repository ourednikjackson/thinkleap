// Proxy server for PubMed API requests to overcome network limitations in containers
import { NextRequest, NextResponse } from 'next/server';

// PubMed API endpoints
const API_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const SEARCH_ENDPOINT = `${API_BASE}/esearch.fcgi`;
const SUMMARY_ENDPOINT = `${API_BASE}/esummary.fcgi`;
const FETCH_ENDPOINT = `${API_BASE}/efetch.fcgi`;

/**
 * Proxy server for PubMed API requests
 * This helps overcome network limitations in containerized environments
 */
export async function GET(request: NextRequest) {
  console.log("=== PUBMED PROXY DEBUG ===");
  console.log("Request URL:", request.url);
  
  try {
    // Log the raw request URL
    console.log("Raw URL parsing...");
    
    // Get endpoint type and parameters from the request
    const parsedUrl = new URL(request.url);
    console.log("Successfully parsed URL:", parsedUrl.toString());
    console.log("Pathname:", parsedUrl.pathname);
    console.log("Search params string:", parsedUrl.search);
    
    const { searchParams } = parsedUrl;
    console.log("Search params entries:");
    Array.from(searchParams.entries()).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    
    const endpoint = searchParams.get('endpoint');
    console.log("Endpoint parameter:", endpoint);
  
    // Validate endpoint
    if (!endpoint || !['search', 'summary', 'fetch'].includes(endpoint)) {
      console.log("Invalid endpoint:", endpoint);
      return NextResponse.json(
        { error: 'Invalid endpoint. Must be one of: search, summary, fetch' },
        { status: 400 }
      );
    }
    
    // Determine the correct PubMed endpoint URL
    let pubmedUrl: string;
    switch (endpoint) {
      case 'search':
        pubmedUrl = SEARCH_ENDPOINT;
        break;
      case 'summary':
        pubmedUrl = SUMMARY_ENDPOINT;
        break;
      case 'fetch':
        pubmedUrl = FETCH_ENDPOINT;
        break;
      default:
        pubmedUrl = SEARCH_ENDPOINT;
    }
    console.log("Selected PubMed endpoint:", pubmedUrl);
    
    // Build PubMed API parameters
    const pubmedParams = new URLSearchParams();
    for (const [key, value] of searchParams.entries()) {
      // Skip our proxy's 'endpoint' parameter
      if (key !== 'endpoint') {
        pubmedParams.append(key, value);
      }
    }
    
    // Make the request to PubMed
    const fullUrl = `${pubmedUrl}?${pubmedParams.toString()}`;
    
    // Log the URL components to debug URL construction
    console.log("PubMed URL base:", pubmedUrl);
    console.log("PubMed params string:", pubmedParams.toString());
    console.log("Full URL for fetch:", fullUrl);
    
    try {
      console.log("Attempting to fetch from PubMed API...");
      const response = await fetch(fullUrl, {
        headers: {
          'User-Agent': 'ThinkLeap/1.0 (https://thinkleap.com; support@thinkleap.com)'
        },
        signal: AbortSignal.timeout(20000) // 20-second timeout
      });
      
      console.log("PubMed API response status:", response.status);
      
      if (!response.ok) {
        throw new Error(`PubMed API responded with status: ${response.status}`);
      }
      
      // Determine content type for response
      const contentType = response.headers.get('content-type') || 'application/json';
      console.log("Response content type:", contentType);
      
      // Handle different response types
      if (contentType.includes('application/json')) {
        const data = await response.json();
        console.log("Returning JSON response");
        return NextResponse.json(data);
      } else if (contentType.includes('text/xml') || contentType.includes('application/xml')) {
        const text = await response.text();
        console.log("Returning XML response");
        return new NextResponse(text, {
          headers: {
            'Content-Type': 'text/xml',
          }
        });
      } else {
        const text = await response.text();
        console.log("Returning text response with content type:", contentType);
        return new NextResponse(text, {
          headers: {
            'Content-Type': contentType,
          }
        });
      }
    } catch (fetchError) {
      console.error("Error fetching from PubMed API:", fetchError);
      throw fetchError; // Re-throw for outer catch block
    }
  } catch (error: any) {
    console.error('PubMed proxy error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to proxy request to PubMed' },
      { status: 502 }
    );
  }
}