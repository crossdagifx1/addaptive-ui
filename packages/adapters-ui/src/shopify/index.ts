export interface ShopifyCustomerContext {
  id?: string | number;
  tags?: string[] | string;
  ordersCount?: number;
  totalSpent?: number;
}

export interface ShopifyCartContext {
  itemCount?: number;
  totalPrice?: number;
  currency?: string;
}

/**
 * Generates an adaptable Shopify theme section in Liquid format (`sections/aui-zone-{{zoneName}}.liquid`).
 */
export function generateShopifyLiquidSection(zoneName: string): string {
  return `{% comment %}
  AUI Adaptive UI Engine - Shopify Liquid Section
  File: sections/aui-zone-${zoneName}.liquid
{% endcomment %}

<div 
  class="aui-shopify-zone" 
  data-aui-zone="${zoneName}" 
  data-aui-shopify-page="{{ template.name }}"
  data-aui-customer-tags="{% if customer %}{{ customer.tags | join: ',' }}{% endif %}"
  data-aui-cart-count="{{ cart.item_count }}"
  data-aui-cart-total="{{ cart.total_price | money_without_currency }}"
>
  {% comment %} Safe Default Liquid Content {% endcomment %}
  <div class="aui-default-content">
    {% for block in section.blocks %}
      {% render block %}
    {% endfor %}
  </div>
</div>

<script>
  (function() {
    if (window.AUI && window.AUI.mountZone) {
      window.AUI.mountZone('${zoneName}');
    }
  })();
</script>

{% schema %}
{
  "name": "AUI Adaptive ${zoneName}",
  "tag": "section",
  "class": "section",
  "settings": [
    {
      "type": "text",
      "id": "heading",
      "label": "Default Zone Title",
      "default": "Welcome to our store"
    }
  ],
  "presets": [
    {
      "name": "AUI Zone: ${zoneName}"
    }
  ]
}
{% endschema %}
`;
}

/**
 * Normalizes Shopify customer and cart context into AUI segment string.
 */
export function extractShopifySegment(
  customer?: ShopifyCustomerContext,
  cart?: ShopifyCartContext
): string {
  const parts: string[] = ['platform:shopify'];

  if (customer && customer.id) {
    parts.push('returning:true');
    const tags = Array.isArray(customer.tags)
      ? customer.tags
      : typeof customer.tags === 'string'
      ? customer.tags.split(',').map((t) => t.trim())
      : [];

    if (tags.some((t) => /vip|wholesale|b2b/i.test(t))) {
      parts.push('tier:vip');
    } else {
      parts.push('tier:standard');
    }
  } else {
    parts.push('returning:false');
  }

  if (cart && cart.itemCount && cart.itemCount > 0) {
    parts.push('cart:active');
    if (cart.totalPrice && cart.totalPrice > 10000) { // e.g. > $100
      parts.push('cart_val:high');
    }
  } else {
    parts.push('cart:empty');
  }

  return parts.join('|');
}
