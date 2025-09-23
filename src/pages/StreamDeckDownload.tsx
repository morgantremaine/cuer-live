import { useEffect } from 'react';

const StreamDeckDownload = () => {
  useEffect(() => {
    // Auto-download the plugin file
    const downloadPlugin = () => {
      // Create a link to download the plugin directory as a zip
      // In a real implementation, this would be a pre-built zip file
      // For now, we'll redirect to the installation page with instructions
      window.location.href = '/stream-deck-plugin/install-instructions.html';
    };

    // Small delay to ensure page loads
    const timer = setTimeout(downloadPlugin, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md mx-auto text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold mb-2">Preparing Stream Deck Plugin</h1>
        <p className="text-muted-foreground mb-4">
          Your download should start automatically...
        </p>
        <p className="text-sm text-muted-foreground">
          If it doesn't start, <a href="/stream-deck-plugin/install-instructions.html" className="text-primary underline">click here</a>
        </p>
      </div>
    </div>
  );
};

export default StreamDeckDownload;