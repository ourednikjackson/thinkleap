// src/lib/auth/cookie-utils.ts
export function setCookie(name: string, value: string, options: Record<string, any> = {}) {
    if (typeof window === 'undefined') return; // Skip on server-side
    
    const cookieOptions = {
      path: '/',
      'max-age': 60 * 60 * 24 * 30, // 30 days by default
      ...options
    };
    
    let cookieString = `${name}=${encodeURIComponent(value)}`;
    
    Object.entries(cookieOptions).forEach(([key, value]) => {
      // Use proper type checking
      if (typeof value === 'boolean') {
        // For boolean values, only include the key if it's true
        if (value === true) {
          cookieString += `; ${key}`;
        }
      } else if (value != null) {
        // For non-boolean, non-null values, add key=value
        cookieString += `; ${key}=${value}`;
      }
    });
    
    document.cookie = cookieString;
    console.log(`Cookie set: ${name} (client-side)`);
  }
  
  export function getCookie(name: string): string | null {
    if (typeof window === 'undefined') return null; // Skip on server-side
    
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [cookieName, cookieValue] = cookie.trim().split('=');
      if (cookieName === name) {
        return cookieValue ? decodeURIComponent(cookieValue) : '';
      }
    }
    return null;
  }
  
  export function deleteCookie(name: string, options: Record<string, any> = {}) {
    if (typeof window === 'undefined') return; // Skip on server-side
    
    const cookieOptions = {
      path: '/',
      ...options,
      'max-age': -1
    };
    
    setCookie(name, '', cookieOptions);
  }