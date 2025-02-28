interface Window {
  Email: {
    send: (params: {
      SecureToken?: string;
      Host?: string;
      Username?: string;
      Password?: string;
      To?: string;
      From?: string;
      Subject?: string;
      Body?: string;
    }) => Promise<any>;
  };
}
