/// <reference types="@figma/plugin-typings" />

figma.showUI(__html__, { width: 400, height: 560 });

function findComponentName(node: BaseNode): string {
  var current: BaseNode | null = node.parent;
  while (current) {
    if (current.type === 'INSTANCE') {
      var mainComp = (current as InstanceNode).mainComponent;
      if (mainComp) return mainComp.name;
      return current.name;
    }
    if (current.type === 'COMPONENT') {
      return current.name;
    }
    current = current.parent;
  }
  return '';
}

function getTextNodes() {
  var selection = figma.currentPage.selection;
  var textNodes: { id: string; characters: string; layerName: string; parentName: string; componentName: string }[] = [];

  function collectTextNodes(node: SceneNode) {
    if (node.type === 'TEXT') {
      var parentName = '';
      if (node.parent) {
        parentName = node.parent.type === 'PAGE' ? 'Page' : (node.parent as SceneNode).name || '';
      }
      textNodes.push({
        id: node.id,
        characters: node.characters,
        layerName: node.name,
        parentName: parentName,
        componentName: findComponentName(node),
      });
    } else if ('children' in node) {
      for (var i = 0; i < node.children.length; i++) {
        collectTextNodes(node.children[i]);
      }
    }
  }

  for (var i = 0; i < selection.length; i++) {
    collectTextNodes(selection[i]);
  }

  return textNodes;
}

// 선택 변경 감지
figma.on('selectionchange', function () {
  var texts = getTextNodes();
  figma.ui.postMessage({ type: 'selection', texts: texts });
});

// 초기 선택 전송
var initialTexts = getTextNodes();
figma.ui.postMessage({ type: 'selection', texts: initialTexts });

// UI 메시지 핸들러
figma.ui.onmessage = async function (msg: any) {
  if (msg.type === 'replace') {
    var node = figma.getNodeById(msg.nodeId);
    if (node && node.type === 'TEXT') {
      try {
        var fonts = node.getRangeAllFontNames(0, node.characters.length);
        for (var i = 0; i < fonts.length; i++) {
          await figma.loadFontAsync(fonts[i]);
        }
        node.characters = msg.newText;
        figma.ui.postMessage({
          type: 'replace-result',
          nodeId: msg.nodeId,
          success: true,
        });
      } catch (error) {
        figma.ui.postMessage({
          type: 'replace-result',
          nodeId: msg.nodeId,
          success: false,
          error: String(error),
        });
      }
    } else {
      figma.ui.postMessage({
        type: 'replace-result',
        nodeId: msg.nodeId,
        success: false,
        error: 'Node not found',
      });
    }
  } else if (msg.type === 'get-storage') {
    var value = await figma.clientStorage.getAsync(msg.key);
    figma.ui.postMessage({
      type: 'storage-result',
      key: msg.key,
      value: value != null ? value : null,
    });
  } else if (msg.type === 'set-storage') {
    await figma.clientStorage.setAsync(msg.key, msg.value);
  } else if (msg.type === 'notify') {
    figma.notify(msg.message);
  }
};
