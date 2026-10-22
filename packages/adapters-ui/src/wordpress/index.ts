export interface WordPressAdapterConfig {
  siteId: string;
  apiEndpoint: string;
  cdnScriptUrl?: string;
  lockedZones?: string[];
  enableShortcodes?: boolean;
}

/**
 * Generates drop-in PHP code for WordPress theme functions.php or a custom plugin.
 */
export function generateWordPressSnippet(config: WordPressAdapterConfig): string {
  const cdn = config.cdnScriptUrl || 'https://cdn.addaptiveui.com/aui.min.js';
  const locked = JSON.stringify(config.lockedZones || ['pricing', 'legal', 'checkout']);

  return `<?php
/**
 * AUI Engine WordPress Integration
 * Drop this snippet into your active child theme's functions.php or mu-plugins directory.
 */
add_action('wp_enqueue_scripts', function() {
    wp_enqueue_script(
        'aui-engine-cdn',
        '${cdn}',
        array(),
        '1.0.0',
        array('in_footer' => true, 'strategy' => 'defer')
    );

    wp_localize_script('aui-engine-cdn', 'AUI_CONFIG', array(
        'siteId' => '${config.siteId}',
        'apiEndpoint' => '${config.apiEndpoint}',
        'lockedZones' => ${locked},
        'pageId' => is_front_page() ? 'home' : get_post_field('post_name', get_post()),
        'isLoggedIn' => is_user_logged_in(),
    ));
});

// Shortcode: [aui_zone name="hero" default="default-hero"]
add_shortcode('aui_zone', function($atts, $content = null) {
    $a = shortcode_atts(array(
        'name' => 'hero',
        'class' => 'aui-zone-wrapper'
    ), $atts);

    return sprintf(
        '<div class="%s" data-aui-zone="%s">%s</div>',
        esc_attr($a['class']),
        esc_attr($a['name']),
        do_shortcode($content)
    );
});
`;
}

/**
 * Normalizes WordPress visitor metadata into AUI segment attributes.
 */
export function parseWordPressContext(wpContext: {
  isLoggedIn?: boolean;
  userRoles?: string[];
  postType?: string;
  referrer?: string;
}): Record<string, string | boolean> {
  return {
    authenticated: Boolean(wpContext.isLoggedIn),
    role: wpContext.userRoles && wpContext.userRoles.length > 0 ? wpContext.userRoles[0]! : 'guest',
    pageType: wpContext.postType || 'page',
    ref: wpContext.referrer || 'direct',
  };
}
