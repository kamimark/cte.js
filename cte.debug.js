'use strict';

(() => {
  const GLOBAL = '$global';
  const IT = '$it';
  const IT_SELECTOR = '[data="$it"]';
  const SIZE_OF_IT = IT.length;
  const OPTIONS = 'cte-options';
  const OPTIONS_SELECTOR = '[cte-options]';
  const DATA = 'data';
  const DATA_SELECTOR = '[data]';
  const DATA_TYPE = 'data-type';
  const DATA_TYPE_SELECTOR = '[data-type]';
  const CTE = 'cte';
  const CTE_SELECTOR = '[cte]';
  const CTE_REF = 'cte-ref';
  const CTE_REF_SELECTOR = '[cte-ref]';
  const ATTRS = 'attrs';
  const ATTRS_SELECTOR = '[attrs]';
  const ANONYMOUS_CTE_START = 'anonymous_cte_template_';

  // DOM helpers

  function ready(fn) {
    if (document.attachEvent ? document.readyState === "complete" : document.readyState !== "loading"){
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }    
  }

  function removeChildren(el) {
    while (el.lastChild)
      el.removeChild(el.lastChild);
  }

  function setAttributes(el, attributes) {
    for (const attributeName in attributes)
      el.setAttribute(attributeName, attributes[attributeName]);
  }

  function parentObjectContainer(el) {
    let parent = el.parentNode;
    while (parent && !parent.hasAttribute(DATA)) {
      parent = parent.parentNode;
    }

    if (!parent)
      console.error(`No parent for ${el} contains ${DATA_SELECTOR}`);
    return parent;
  }


  // General helpers

  function resolveSafe(object, paths) {
    return paths.reduce((prev, curr) => {
        if (!prev || !(curr in prev))
          return undefined;
        return prev[curr];
    }, object);
  }

  function insertSafe(object, paths, value) {
    let root = object;

    for (let i = 0; i < paths.length - 1; ++i) {
      const path = paths[i];
      let newRoot;
      if (path in root) {
        newRoot = root[path];
      } else { 
        if (isNaN(paths[i + 1]))
          newRoot = {};
        else
          newRoot = []; 

        if (Array.isArray(root))
          root.push(newRoot);
        else
          root[path] = newRoot;
      }

      root = newRoot;
    }

    const key = paths[paths.length - 1];
    if (Array.isArray(root) && !(key in root))
      root.push(value);
    root[key] = value;

    return object;
  }



  // Lib core

  const base = {
    wrapType(el, value) {
      switch (el.getAttribute(DATA_TYPE)) {
        case "number":
          return value * 1;
        default:
          return value;
      }
    },
    getNumber(el, value) {
      if (value === null || value === undefined)
        value = el.getAttribute('defaultValue');
      if (value === null || value === undefined)
        value = el.getAttribute('min');
      return value === null || value === undefined ? '' : value;
    },
    specialInputTags: {
      checkbox: { 
        set(el, value) {
          el.checked = (value && value != "false");
        },
        get(el) {
          return el.checked;
        }
      },
      number: {
        set(el, value) {
          el.value = base.getNumber(el, value);
        },
        get (el) {
          return el.value * 1;
        }
      },
      range: {
        set(el, value) {
          value = base.getNumber(el, value);
          el.value = value ? value : 0;
        },
        get(el) {
          return el.value * 1;
        }
      }
    },
    specialTags: {
      INPUT: {
        set(el, value) {
          const type = el.getAttribute('type');
          if (type in base.specialInputTags)
            base.specialInputTags[type].set(el, value);
          else
            el.value = value ? value : '';
        },
        get(el) {
          const type = el.getAttribute('type');
          if (type in base.specialInputTags)
            return base.specialInputTags[type].get(el);
          else
            return el.value;
        }
      },
      SELECT: {
        set(el, value) {
          el.value = value;
        },
        get(el) {
          return el.value;
        }
      }
    },
    get(el, value) {
      if (el.tagName in base.specialTags)
        return base.wrapType(el, base.specialTags[el.tagName].get(el));
      else
        return base.wrapType(el, el.innerHTML);
    },
    set(el, value) {
      if (el.tagName in base.specialTags)
        base.specialTags[el.tagName].set(el, value);
      else
        el.innerHTML = value ? value : '';      
    }
  };

  function getTemplate(id) {
    if (id in templates) {
      const template = templates[id].cloneNode(true);
      template.removeAttribute(CTE);
      
      return template;
    } else {
      console.error(`Template ${id} not defined`);
    }
  }

  function resolveIT(template, scope) {
    for (const el of template.querySelectorAll(IT_SELECTOR)) {
      const parentEl = parentObjectContainer(el);
      el.setAttribute('parent-data', parentEl.getAttribute(DATA));
      el.removeAttribute(DATA);
    }
  }

  function resolveTemplate(template, object, objDataPath = '') {
    for (const el of template.querySelectorAll(DATA_SELECTOR)) {
      let elDataPath = el.getAttribute(DATA);
      if (elDataPath.startsWith(IT))
        if (elDataPath == IT)
          elDataPath = elDataPath.substring(SIZE_OF_IT);
        else
          elDataPath = elDataPath.substring(SIZE_OF_IT + 1);

      if (objDataPath && elDataPath)
        elDataPath = '.' + elDataPath;

      const dataPath = objDataPath + elDataPath;
      const objectValue = resolveSafe(object, dataPath.split('.'));

      if (Array.isArray(objectValue)) {
        if (!el.children.length)
          continue;

        const children = el.cloneNode(true).children;
        removeChildren(el);

        for (let i = 0; i < objectValue.length; ++i) {
          const fakeParent = document.createElement("DIV");
          for (const childTemplate of children)
            fakeParent.appendChild(childTemplate.cloneNode(true));

          resolveTemplate(fakeParent, object, `${dataPath}.${i}`);
          for (const child of fakeParent.children)
            el.appendChild(child);
        }
      } else if (!el.ctePassed) {
        if (typeof objectValue == "function")
          objectValue = objectValue();
        else
          el.cteDataPath = dataPath;
        base.set(el, objectValue);
      }

      el.ctePassed = true;
    }
  }
  
  function expandTemplate(template, object) {
    let refs = template.querySelectorAll(CTE_REF_SELECTOR);
    while (refs.length) {
      for (const el of refs) {
        const refId = el.getAttribute(CTE_REF);
        const dataPath = el.getAttribute(DATA);
        const objectValue = resolveSafe(object, dataPath.split('.'));
        const isArray = Array.isArray(objectValue);

        el.removeAttribute(CTE_REF);
        removeChildren(el);

        const template = getTemplate(refId);

        for (const child of template.querySelectorAll(DATA_SELECTOR)) {
          const childDataPath = child.getAttribute(DATA);
          if (childDataPath.startsWith(IT))
            continue;

          if (isArray)
            child.setAttribute(DATA, `${IT}.${childDataPath}`);
          else
            child.setAttribute(DATA, `${dataPath}.${childDataPath}`);
        }

        el.appendChild(template);

        if (!isArray)
          el.removeAttribute(DATA);
      }

      refs = template.querySelectorAll(CTE_REF_SELECTOR);
    }    
  }

  function putObject(template, object) {
    if (Array.isArray(object)) {
      console.error("Cannot handle array as object for populating a singular template");
      return;
    }

    for (const el of template.querySelectorAll(ATTRS_SELECTOR)) {
      const dataPath = el.getAttribute(ATTRS);
      const paths = dataPath.split('.');
      if (paths[0] == GLOBAL)
        setAttributes(el, resolveSafe($global, paths));
      else
        setAttributes(el, resolveSafe(object, paths));
    }

    expandTemplate(template, object);
    resolveTemplate(template, object);

    for (const el of template.querySelectorAll(DATA_SELECTOR))
      el.ctePassed = false;
  }

  function getObject(template) {
    const object = {};
    for (const el of template.querySelectorAll(DATA_SELECTOR)) {
      const dataPath = el.cteDataPath;
      if (dataPath !== undefined)
        insertSafe(object, dataPath.split('.'), base.get(el));
    }
    return object;
  }

  
  
  
  
  // New dom wrappers
  function newDom(template, container, object) {
    putObject(template, object);
    container.appendChild(template);
  }

  function newDomUsingTemplateId(templateId, container, object) {
    const template = getTemplate(templateId);
    if (template)
      newDom(template, container, object)
    else
      console.error(`Cannot find template with id ${templateId}`);
    return template;
  }

  function newDomUsingSelector(templateId, selector, objects) {
    const result = [];
    for (const container of document.querySelectorAll(selector))
      result.push(newDomUsingTemplateId(templateId, container, objects));
    if (result.length == 1)
      return result[0];
    return result;
  }

  function newDomUsingSelectorAndObjects(templateId, selector, objects) {
    if (Array.isArray(objects)) {
      const result = [];
      for (const object of objects)
        result.push(newDomUsingSelector(templateId, selector, object));
      return result;
    } else {
      return newDomUsingSelector(templateId, selector, objects);
    }
  }

  const $global = {};
  const lib = {
    $global,
    getTemplate,
    newDom: newDomUsingSelectorAndObjects,
    getObject
  };

  const appScope = insertSafe(window, 'com.mental-elemental.cte'.split('.'), {});
  appScope.lib = lib;
  const templates = {};

  ready(() => {
    for (const template of document.querySelectorAll(CTE_SELECTOR)) {
      const id = template.getAttribute(CTE);
      template.removeAttribute(CTE);
      template.parentNode.removeChild(template);
      templates[id] = template;
    }    
  });

  window.cte = lib;
})();
