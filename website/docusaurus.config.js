// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Nucypher TS',
  tagline: 'Interact with Nucypher via the browser',
  url: 'https://nucypher.github.io/',
  baseUrl: '/nucypher-ts/',
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'favicon.ico',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'nucypher', // Usually your GitHub org/user name.
  projectName: 'nucypher-ts', // Usually your repo name.
  trailingSlash: false,

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      '@docusaurus/preset-classic',
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          routeBasePath: '/'
          },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      algolia: {
        // The application ID provided by Algolia
        appId: 'YZ4ISSA71K',
  
        // Public API key: it is safe to commit it
        apiKey: 'ec449ad3e540f4188163f3484f6f07d1',
        externalUrlRegex: 'external\\.com|domain\\.com',
  
        indexName: 'nucypher-ts',
        searchPagePath: false,
        },
      navbar: {
        title: 'Nucypher-ts',
        logo: {
          alt: 'My Site Logo',
          src: 'img/nucypher.png',
        },
        items: [
          {
            type: 'doc',
            docId: 'Introduction',
            position: 'left',
            label: 'Documentation',
          },
          {
            type: 'docsVersionDropdown',
            position: 'left',
            dropdownItemsAfter: [{to: '/versions', label: 'All versions'}],
            dropdownActiveClassDisabled: true,
          },
          {
            href: 'https://github.com/nucypher/nucypher-ts',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Introduction',
                to: '/docs/Introduction',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'DAO Forum',
                href: 'https://forum.threshold.network/',
              },
              {
                label: 'Discord',
                href: 'https://discord.gg/RwjHbgA7uQ',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/nucypher/nucypher-ts',
              },
              {
                label: 'Twitter',
                href: 'https://twitter.com/theTnetwork',
              },
            ],
          },
        ]
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
