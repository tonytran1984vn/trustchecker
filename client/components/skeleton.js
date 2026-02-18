/**
 * TrustChecker – Skeleton Loading Components (v9.2)
 * Shimmer-effect placeholders for content loading states.
 */

/**
 * Returns skeleton HTML for different content types.
 * @param {'dashboard'|'table'|'chart'|'card'|'list'} type 
 */
export function renderSkeleton(type = 'dashboard') {
    const shimmer = 'background:linear-gradient(90deg,var(--bg-tertiary) 25%,var(--bg-card) 50%,var(--bg-tertiary) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite';

    switch (type) {
        case 'dashboard':
            return `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px">
          ${[1, 2, 3, 4].map(() => `<div class="card" style="padding:24px"><div style="height:18px;width:60%;border-radius:4px;margin-bottom:12px;${shimmer}"></div><div style="height:32px;width:40%;border-radius:4px;${shimmer}"></div></div>`).join('')}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          ${[1, 2].map(() => `<div class="card" style="padding:24px"><div style="height:18px;width:50%;border-radius:4px;margin-bottom:16px;${shimmer}"></div><div style="height:200px;border-radius:8px;${shimmer}"></div></div>`).join('')}
        </div>
      `;

        case 'table':
            return `
        <div class="card" style="padding:20px">
          <div style="height:18px;width:30%;border-radius:4px;margin-bottom:20px;${shimmer}"></div>
          ${[1, 2, 3, 4, 5].map(() => `<div style="display:flex;gap:16px;margin-bottom:12px">${[1, 2, 3, 4].map((_, i) => `<div style="height:16px;width:${25 - i * 3}%;border-radius:4px;${shimmer}"></div>`).join('')}</div>`).join('')}
        </div>
      `;

        case 'chart':
            return `
        <div class="card" style="padding:24px">
          <div style="height:18px;width:40%;border-radius:4px;margin-bottom:16px;${shimmer}"></div>
          <div style="height:250px;border-radius:8px;${shimmer}"></div>
        </div>
      `;

        case 'card':
            return `
        <div class="card" style="padding:24px">
          <div style="height:18px;width:60%;border-radius:4px;margin-bottom:12px;${shimmer}"></div>
          <div style="height:14px;width:80%;border-radius:4px;margin-bottom:8px;${shimmer}"></div>
          <div style="height:14px;width:45%;border-radius:4px;${shimmer}"></div>
        </div>
      `;

        case 'list':
            return `
        <div class="card" style="padding:16px">
          ${[1, 2, 3, 4, 5, 6].map(() => `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
              <div style="width:36px;height:36px;border-radius:50%;flex-shrink:0;${shimmer}"></div>
              <div style="flex:1"><div style="height:14px;width:60%;border-radius:4px;margin-bottom:6px;${shimmer}"></div><div style="height:12px;width:40%;border-radius:4px;${shimmer}"></div></div>
            </div>
          `).join('')}
        </div>
      `;

        default:
            return `<div style="padding:40px;text-align:center"><div style="height:24px;width:200px;margin:0 auto;border-radius:4px;${shimmer}"></div></div>`;
    }
}

window.renderSkeleton = renderSkeleton;
