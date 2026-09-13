const nextConfig = {
  async rewrites() {
    return [
      { source: "/l/:loanOfficer/:campaign", destination: "/app.html?lo=:loanOfficer&campaign=:campaign" },
      { source: "/l/:loanOfficer", destination: "/app.html?lo=:loanOfficer" }
    ];
  }
};

export default nextConfig;
