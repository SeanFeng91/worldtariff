document.addEventListener('DOMContentLoaded', function() {
    const sectorTabs = document.querySelectorAll('.sector-tab');
    const sectorPanels = document.querySelectorAll('.sector-panel');

    sectorTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // 移除所有标签页的激活状态
            sectorTabs.forEach(t => {
                t.classList.remove('border-red-500', 'text-red-600', 'border-green-500', 'text-green-600');
                t.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
                t.removeAttribute('aria-current');
            });

            // 隐藏所有内容面板
            sectorPanels.forEach(panel => {
                panel.classList.add('hidden');
            });

            // 激活当前标签页
            tab.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
            tab.setAttribute('aria-current', 'page');
            const panelId = tab.id.replace('sector-tab-', 'sector-panel-');
            if (tab.id === 'sector-tab-negative') {
                tab.classList.add('border-red-500', 'text-red-600');
            } else {
                tab.classList.add('border-green-500', 'text-green-600');
            }

            // 显示对应的内容面板
            const targetPanel = document.getElementById(panelId);
            if (targetPanel) {
               targetPanel.classList.remove('hidden');
            } else {
               console.error("Target panel not found:", panelId);
            }
        });
    });
});