export const exportRundownAsPDF = async (rundownTitle: string): Promise<void> => {
  // Just trigger the print dialog - users can select "Save as PDF" from there
  // This uses the exact same print logic that already works perfectly
  window.print();
};