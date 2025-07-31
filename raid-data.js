// NYLA Go - Shared Raid Data Source
// This file contains the definitive raid list data used by both Extension and PWA

const NYLA_RAID_DATA = {
  categories: [
    {
      id: 'nyla-core',
      title: 'NYLA Core',
      items: [
        {
          id: 'the-team',
          name: 'The Team',
          description: 'Key NYLA project contributors - support their posts',
          url: 'https://x.com/i/lists/1940678457350029559',
          icon: '→'
        }
      ]
    },
    {
      id: 'community',
      title: 'Community',
      items: [
        {
          id: 'active-raiders',
          name: 'Active NYLA Raiders',
          description: 'Follow these community members\' engagement patterns',
          url: 'https://x.com/i/lists/1950200431432647034',
          icon: '→'
        },
        {
          id: 'ticker-mentioned',
          name: '$NYLA ticker mentioned',
          description: 'Engage top/latest X posts around $NYLA',
          url: 'https://x.com/search?q=%24NYLA&src=typed_query&f=live',
          icon: '→'
        }
      ]
    }
  ]
};

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = NYLA_RAID_DATA;
} else {
  // Browser environment
  window.NYLA_RAID_DATA = NYLA_RAID_DATA;
}