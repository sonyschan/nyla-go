// NYLA Go - Shared Application Data Source  
// This file contains all shared data structures used by both Extension and PWA

const NYLA_COMMUNITY_DATA = {
  // Community menu items for Extension three-dot menu and PWA floating menu
  menuItems: [
    {
      id: 'raid',
      name: 'Community Raids',
      description: 'Join community engagement campaigns',
      icon: '🎯',
      action: 'showRaid',
      i18nKey: 'menu.raids'
    },
    {
      id: 'app',
      name: 'Community Apps',
      description: 'Discover NYLA community applications',
      icon: '🚀', 
      action: 'showApp',
      i18nKey: 'menu.apps'
    },
    {
      id: 'settings',
      name: 'Settings',
      description: 'Language and account preferences',
      icon: '⚙️',
      action: 'showSettings',
      i18nKey: 'menu.settings'
    }
  ]
};

const NYLA_FOOTER_DATA = {
  // Shared footer links for both Extension and PWA
  links: [
    {
      id: 'feedback',
      text: 'Feedback',
      i18nKey: 'footer.feedback',
      url: 'https://x.com/h2crypto_eth',
      target: '_blank',
      type: 'link'
    },
    {
      id: 'donate',
      text: 'Donate',
      i18nKey: 'footer.donate',
      action: 'showDonate',
      type: 'action'
    }
  ]
};

const NYLA_RAID_DATA = {
  categories: [
    {
      id: 'nyla-core',
      title: 'NYLA Core',
      i18nKey: 'raids.core.title',
      items: [
        {
          id: 'the-team',
          name: 'The Team',
          description: 'Key NYLA project contributors - support their posts',
          i18nNameKey: 'raids.team.title',
          i18nDescKey: 'raids.team.description',
          url: 'https://x.com/i/lists/1940678457350029559',
          icon: '->'
        }
      ]
    },
    {
      id: 'community',
      title: 'Community',
      i18nKey: 'raids.community.title',
      items: [
        {
          id: 'active-raiders',
          name: 'Active NYLA Raiders',
          description: 'Follow these community members\' engagement patterns',
          i18nNameKey: 'raids.active.title',
          i18nDescKey: 'raids.active.description',
          url: 'https://x.com/i/lists/1950200431432647034',
          icon: '->'
        },
        {
          id: 'ticker-mentioned',
          name: '$NYLA ticker mentioned',
          description: 'Engage top/latest X posts around $NYLA',
          i18nNameKey: 'raids.ticker.title',
          i18nDescKey: 'raids.ticker.description',
          url: 'https://x.com/search?q=%24NYLA&src=typed_query&f=live',
          icon: '->'
        }
      ]
    }
  ]
};

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = { NYLA_COMMUNITY_DATA, NYLA_FOOTER_DATA, NYLA_RAID_DATA };
} else {
  // Browser environment
  window.NYLA_COMMUNITY_DATA = NYLA_COMMUNITY_DATA;
  window.NYLA_FOOTER_DATA = NYLA_FOOTER_DATA;
  window.NYLA_RAID_DATA = NYLA_RAID_DATA;
}