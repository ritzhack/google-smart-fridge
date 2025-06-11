// Helper function to handle image data
export const getImageSrc = (imageData: string | undefined): string | undefined => {
  if (!imageData) return undefined;
  
  // If it's already a URL that starts with http
  if (imageData.startsWith('http')) {
    return imageData;
  }
  
  // If it's a base64 string that doesn't have the data URL prefix
  if (!imageData.startsWith('data:')) {
    return `data:image/jpeg;base64,${imageData}`;
  }
  
  // If it already has the data URL prefix
  return imageData;
}; 