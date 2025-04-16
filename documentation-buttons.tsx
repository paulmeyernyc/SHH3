import React from 'react';
import { useTranslation } from 'react-i18next';

export function DocumentationButtons() {
  const { t } = useTranslation();
  
  return (
    <div className="mt-16 mb-8">
      <h2 className="text-2xl font-bold text-white text-center mb-2">Developer Tools</h2>
      <p className="text-gray-400 text-center mb-8">Access specialized tools for platform testing and integration development</p>
      
      <div className="flex flex-row justify-center gap-4 mb-16">
        <a 
          href="/testing-portal" 
          className="flex items-center px-6 py-3 border border-primary rounded-md text-primary hover:bg-primary/5 transition-colors"
          style={{ width: '205px' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 5l7 7-7 7M5 12h15" />
          </svg>
          Testing Portal
        </a>
        <a 
          href="/integration-gateway" 
          className="flex items-center px-6 py-3 border border-primary rounded-md text-primary hover:bg-primary/5 transition-colors"
          style={{ width: '205px' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 5l7 7-7 7M5 12h15" />
          </svg>
          Integration Gateway
        </a>
      </div>
      
      <div className="flex flex-row justify-center gap-4">
        <a 
          href="/system-architecture" 
          className="block text-primary border border-primary hover:bg-primary/5 px-6 py-3 rounded-md text-center transition-colors"
          style={{ width: '205px' }}
        >
          System Architecture
        </a>
        <a 
          href="/service-documentation" 
          className="block text-primary border border-primary hover:bg-primary/5 px-6 py-3 rounded-md text-center transition-colors"
          style={{ width: '205px' }}
        >
          Service Documentation
        </a>
        <a 
          href="/api-documentation" 
          className="block text-primary border border-primary hover:bg-primary/5 px-6 py-3 rounded-md text-center transition-colors"
          style={{ width: '205px' }}
        >
          API Reference
        </a>
      </div>
    </div>
  );
}