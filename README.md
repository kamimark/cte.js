# Client Templating Engine cte.js 

This is a tiny js library with no dependencies that helps you paste templates of html in your dom.

## Getting Started

Download the js file.

### Prerequisites

No prerequisites

### Installing

Include the js file in your project.
```html
  <script src="cte.min.js"></script>
```

## Basic Example
Add your template in your HTML

```html
  <template id="basic">
    <div>
      <h1 path="title"></h1>
      <h2 path="subtitle"></h2>
      <input type="text" path="content.field1" placeholder="field1" />
      <input type="text" path="content.field2" placeholder="field2" />
    </div>
  </template>
```

Add your expansion code in your javascript
```javascript
const obj = {
    title: 'My Title',
    subtitle: 'My Subtitle',
    content: {
        field1: 'Field 1 Data',
        field2: 'Field 2 Data'
    }
};

const node = cte.newNode('basic', obj);
document.body.append(node);
```

## Advanced Example

You can use getters and setters

```html
  <template id="advanced">
    <div>
      <h1 path="title" set="customColor" get="customColor"></h1>
      <h2 path="subtitle"></h2>
      <input type="text" path="content.field1" placeholder="field1" id="field1" />
      <input type="text" path="content.field2" placeholder="field2" />
    </div>
  </template>

  <div id="container"></div>
```

```javascript
const obj = {
    title: {color: 'red', text: 'My Title'},
    subtitle: 'My Subtitle',
    content: {
        field1: 'Field 1 Data',
        field2: 'Field 2 Data'
    }
};

cte.setSetter('customColor', (el, value) => {
  el.innerHTML = value.text;
  el.style.color = value.color;
});

cte.setGetter('customColor', (el) => {
  return {
    color: el.style.color,
    text: el.innerHTML
  };
});

const node = cte.newNode('advanced', obj);
document.getElementById('container').append(node);

// Changing the value of the input field
node.querySelector('#field1').value = 'Changed Value';

const newObject = cte.getObject(node);
// Do what you will


obj.subtitle = 'Changed Subtitle';
cte.putObject(node, obj);
// Reflects change in DOM
```


## Current API
Basic function for getting a new node
```javascript
newNode(templateId, object);
```

Getting a data object using the defined getters in the dom
```javascript
getObject(node);
```

Overwritting the data of the node
```javascript
putObject(node, object);
```

Create custom setters/getters
```javascript
setSetter(path, setterFunc)
setGetter(path, getterFunc)
setTransformer(path, {set: setterFunc, get: getterFunc})
```

Helper Getters/Setters
```javascript
getDefaultArrayGetter
getDefaultArraySetter
setDefaultSetter(tagName, func)
getDefaultSetter
getDefaultGetter
```

Override default visibility class ("hidden") when using the basic visibility getter 
```javascript
setVisibilityClass(className)
```


## ToDo
Add observables

## Running the tests

Open the example.html. It's self-contained tutorial and unitests.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
