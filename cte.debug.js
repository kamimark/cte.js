'use strict';

(() => {
  const IT = '$it';
  const DATA = 'data';
  const DATA_SELECTOR = '[data]';
  const CTE = 'cte';
  const CTE_SELECTOR = '[cte]';
  const CTE_REF = 'cte-ref';
  const CTE_REF_SELECTOR = '[cte-ref]';
  const SETTER = 'setter';
  const GETTER = 'getter';
  const NO_GETTER_DEFINED = function(){};
  let visibilityClass = 'hidden';

  const setters = {};
  const getters = {};
  const settersDefault = {};
  const gettersDefault = {};
  const _ctePassed = [];

  // Configuration
  const setterArray = (el, array) => {
    const isNew = !el._cteArrayElementSet;
    if (isNew) {
      el._cteArrayElementSet = [];
      for (const child of el.children)
        el._cteArrayElementSet.push(child.cloneNode(true));
    }

    el.innerHTML = '';
    for (const object of array)
      for (const child of el._cteArrayElementSet)
        el.appendChild(_putObject(child.cloneNode(true), object));
  };

  const getterArray = (el) => {
    const result = [];
    if (el.children.length == 0)
      return result;

    if (!el._cteArrayElementSet)
      return console.error('Currently unsupported! Cannot get data from array node that was never set');

    for (const child of el.children) {
      let newObject = _getObject(child);
      if (newObject === NO_GETTER_DEFINED)
        return NO_GETTER_DEFINED;

      const key = child.getAttribute(DATA);
      if (key && key != IT)
        newObject = { [key]: newObject };

      if (typeof newObject == 'object' && IT in newObject)
        newObject = newObject[IT];

      result.push(newObject);
    }

    return result;
  };

  const setterValue = (el, value) => {
    el.value = value === undefined || value === null ? '' : value;
  };

  const getterValue = (el) => {
    return el.value;
  };

  const setterNumberValue = (el, value) => {
    if (isNaN(value) && value !== undefined)
      return console.error(`Attempt to set into el value ${value} as a number`);
    el.value = value * 1;
  };

  const getterNumberValue = (el) => {
    return getNumberFromElement(el, el.value);
  };

  const setterRaw = (el, value) => {
    el.innerHTML = value;
  };

  const getterRaw = (el) => {
    return el.innerHTML;
  };

  const setterSrc = (el, value) => {
    el.src = value;
  };

  const getterSrc = (el) => {
    return el.src;
  };

  const setterHref = (el, value) => {
    el.href = value;
  };

  const getterHref = (el) => {
    return el.href;
  };

  const setterObject = (el, object) => {
    el._cteOriginalObjectKeys = Object.keys(object);
    for (const key of el._cteOriginalObjectKeys) {
      if (object[key] !== undefined)
        el[key] = object[key];
    }
  };

  const setterAttrObject = (el, object) => {
    el._cteOriginalObjectKeys = Object.keys(object);
    for (const key of el._cteOriginalObjectKeys)
      if (object[key] !== undefined)
        el.setAttribute(key, object[key]);
  };

  const setterVisibility = (el, value) => {
    el.classList.toggle(visibilityClass, !value);
  };

  const getterVisibility = (el) => {
    return !el.classList.contains(visibilityClass);
  };

  settersDefault['A'] = (el, value) => {
    setterHref(el, value);
    if (!el.innerHTML)
      el.innerHTML = value;
  };

  gettersDefault['A'] = getterHref;
  settersDefault['IMG'] = setterSrc;
  gettersDefault['IMG'] = getterSrc;
  settersDefault['IFRAME'] = setterSrc;
  gettersDefault['IFRAME'] = getterSrc;
  settersDefault['OBJECT'] = setterSrc;
  gettersDefault['OBJECT'] = getterSrc;
  settersDefault['SELECT'] = setterValue;
  gettersDefault['SELECT'] = getterValue;
  settersDefault['TEXTAREA'] = setterValue;
  gettersDefault['TEXTAREA'] = getterValue;

  setters['visibility'] = setterVisibility;
  getters['visibility'] = getterVisibility;
  setters['raw'] = setterRaw;
  getters['raw'] = getterRaw;

  setters['html-object'] = setterObject;
  setters['attr-object'] = setterAttrObject;

  const settersInput = {
    range: setterNumberValue,
    number: setterNumberValue,
    checkbox(el, value) {
      el.checked = (value && value != "false");
    },
  };

  const gettersInput = {
    range: getterNumberValue,
    number: getterNumberValue,
    checkbox(el) {
      return el.checked;
    },
  };

  settersDefault['INPUT'] = (el, value) => {
      const type = el.getAttribute('type');
      const setter = settersInput[type];
      if (setter)
        return setter(el, value);
      return setterValue(el, value);
  };

  gettersDefault['INPUT'] = (el) => {
      const type = el.getAttribute('type');
      const getter = gettersInput[type];
      if (getter)
        return getter(el);
      return getterValue(el);
  };
  
  
  
  // DOM helpers

  function ready(fn) {
    if (document.attachEvent ? document.readyState === "complete" : document.readyState !== "loading") {
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  }

  // General helpers

  function intersection(array1, array2) {
    return array1.filter(value => -1 !== array2.indexOf(value));
  }

  function resolveSafe(object, path) {
    if (!path)
      return object;

    return path.split('.').reduce((prev, curr) => {
      if (curr === '')
        return prev;
      if (!prev || !(curr in prev))
        return undefined;
      return prev[curr];
    }, object);
  }

  function insertSafe(object, path, value) {
    if (typeof object != "object")
      return console.error(`insertSafe Object for path ${path} is not an object`);

    let root = object;
    const paths = path.split('.');

    const lastIndex = paths.length - 1;
    for (let i = 0; i < lastIndex; ++i) {
      const path = paths[i];
      if (typeof root[path] == "object")
        root = root[path];
      else
        root = root[path] = {};
    }

    root[paths[lastIndex]] = value;
    return object;
  }

  function getNumberFromElement(el, value) {
    if (value === null || value === undefined) {
      if (el.defaultValue)
        return el.defaultValue;
      if (el.min || el.min === 0)
        return el.min;
      return 0;
    } else {
      return value * 1
    }
  }

  // Lib core

  function getElementValue(el) {
    const customGetterName = el.getAttribute(GETTER);
    if (customGetterName) {
      const getter = getters[customGetterName];
      if (getter)
        return getter(el);
      return console.error(`Custom getter ${customGetterName} specified but not defined.`);
    }

    if (Array.isArray(el._cteOriginalValue))
      return getterArray(el);

    const getter = gettersDefault[el.tagName];
    if (getter)
      return getter(el);

    return NO_GETTER_DEFINED;
  }

  function setElementValue(el, value) {
    el._cteOriginalValue = value;

    const customSetterName = el.getAttribute(SETTER);
    if (customSetterName) {
      const setter = setters[customSetterName];
      if (setter)
        return setter(el, value);
      return console.error(`Custom setter ${customSetterName} specified but not defined.`);
    }

    if (Array.isArray(value))
      return setterArray(el, value);

    const setter = settersDefault[el.tagName];
    if (setter)
      return setter(el, value);

    return el.innerHTML = value === undefined || value === null ? '' : value;
  }

  function getTemplate(id) {
    if (id in templates) {
      const template = templates[id].cloneNode(true);
      template.removeAttribute(CTE);

      return template;
    } else {
      console.error(`Template ${id} not defined`);
    }
  }

  function _putObject(node, object) {
    if (node._ctePassed)
      return node;

    const elDataPath = node.getAttribute(DATA);
    const objectValue = resolveSafe(object, elDataPath == IT ? '' : elDataPath);
    if (typeof objectValue == "function")
      objectValue = objectValue();

    let setElement = true;
    const resolveChildrenInstead = !node.hasAttribute(DATA) || !Array.isArray(objectValue) && typeof objectValue == "object";

    if (resolveChildrenInstead) {
      const children = node.querySelectorAll(DATA_SELECTOR);
      setElement = children.length == 0;
      for (const child of children)
        _putObject(child, objectValue);
    }

    if (setElement)
      setElementValue(node, objectValue);

    node._ctePassed = true;
    _ctePassed.push(node);

    return node;
  }

  function expandTemplate(template) {
    const PARENT_DATA = 'parent-data';
    const PARENT_DATA_SELECTOR = '[parent-data]';
    let refs = template.querySelectorAll(CTE_REF_SELECTOR);
    while (refs.length) {
      for (const el of refs) {
        const refId = el.getAttribute(CTE_REF);
        const parentDataPath = el.getAttribute(DATA);
        const node = getTemplate(refId);

        el.removeAttribute(CTE_REF);
        el.removeAttribute(DATA);
        el.innerHTML = '';

        if (parentDataPath) {
          const existingParentDataPath = node.getAttribute(PARENT_DATA);
          node.setAttribute(PARENT_DATA, existingParentDataPath ? `${existingParentDataPath}.parentDataPath` : parentDataPath);
        }

        el.appendChild(node);
      }

      refs = template.querySelectorAll(CTE_REF_SELECTOR);
    }

    for (const el of template.querySelectorAll(PARENT_DATA_SELECTOR)) {
      const elDataPath = el.getAttribute(DATA);
      let dataPath = elDataPath == IT ? '' : elDataPath;

      const parentDataPath = el.getAttribute(PARENT_DATA);
      el.removeAttribute(PARENT_DATA);

      if (parentDataPath && dataPath)
        dataPath = `${parentDataPath}.${dataPath}`;
      else if (parentDataPath)
        dataPath = parentDataPath;

      el.setAttribute(DATA, dataPath);
    }
  }

  function compress(object) {
    if (typeof object != "object")
      return object;

    const keys = Object.keys(object);
    if (keys.length == 0)
      return object;

    let isArray = true;
    for (const key of keys) {
      if (isNaN(key)) {
        isArray = false;
        break;
      }
    }

    if (isArray) {
      const numericKeys = [];
      for (const key of keys)
        numericKeys.push(key * 1);

      const newObject = [];
      for (const key of numericKeys.sort()) {
        newObject.push(compress(object[key]));
      }

      return newObject;
    }

    for (const key of keys)
      object[key] = compress(object[key]);

    return object;
  }

  function _getObject(node) {
    if (node._ctePassed)
      return;

    let children = node.querySelectorAll(DATA_SELECTOR);

    let value;
    if (node._cteArrayElementSet || (node.hasAttribute(DATA) && !children.length)) {
      value = getElementValue(node);
    } else {
      value = {};
      for (const child of children) {
        if (child._ctePassed)
          continue;
        const object = _getObject(child);
        if (object !== NO_GETTER_DEFINED)
          insertSafe(value, child.getAttribute(DATA), object);
      }

      if (!Object.keys(value).length)
        value = NO_GETTER_DEFINED;
    }

    node._ctePassed = true;
    _ctePassed.push(node);
    return value;
  }

  function getObject(template) {
    const object = _getObject(template);

    for (const node of _ctePassed)
      delete node._ctePassed;

    return object;
  }

  function putObject(template, object) {
    _putObject(template, object);
  }
  
  function newNode(templateId, object) {
    const template = getTemplate(templateId);

    expandTemplate(template);
    _putObject(template, object);

    for (const node of _ctePassed)
      delete node._ctePassed;

    return template;
  }

  function setGetter(name, object) {
    if (typeof object == 'function')
      return getters[name] = object;
    for (const key of Object.keys(object))
      setGetter(`${name}.${key}`, object[key])
    return object;
  }

  function setSetter(name, object) {
    if (typeof object == 'function')
      return setters[name] = object;
    for (const key of Object.keys(object))
      setSetter(`${name}.${key}`, object[key])
    return object;
  }

  function setTransformer(name, object) {
    if (typeof object.set == 'function')
      setters[name] = object;
    if (typeof object.get == 'function')
      getters[name] = object;
    for (const key of Object.keys(object))
      if (key != 'set' && key != 'get')
        setTransformer(`${name}.${key}`, object[key])
    return object;
  }
  
  function getDefaultSetter(el) {
    return settersDefault[el.tagName];
  }

  function getDefaultGetter(el) {
    return gettersDefault[el.tagName];
  }

  const lib = {
    newNode,
    getObject,
    putObject,
    getDefaultSetter,
    getDefaultGetter,
    setTransformer,
    setSetter,
    setGetter,
    getDefaultArrayGetter() {
      return getterArray;
    },
    getDefaultArraySetter() {
      return setterArray;
    },
    setVisibilityClass(className) {
      visibilityClass = className;
    }
  };

  const appScope = insertSafe(window, 'com.mental-elemental.cte', {});
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
