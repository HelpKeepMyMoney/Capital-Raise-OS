/** HubSpot scheduler for demo requests */
export const BOOK_DEMO_HREF = "https://meetings-na2.hubspot.com/mevans";

/** Public folder screenshot paths (spaces encoded for next/image reliability) */
export const SCREENSHOT = {
  hero: encodeURI("/Screenshot 1.png"),
  crm: encodeURI("/Screenshot 21.png"),
  dealRoom: encodeURI("/Screenshot 8.png"),
  investorExp: encodeURI("/Screenshot 9.png"),
  dataRoom: encodeURI("/Screenshot 16.png"),
  tasks: encodeURI("/Screenshot 20.png"),
} as const;
