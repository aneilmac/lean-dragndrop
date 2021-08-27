import * as Blockly from 'blockly';

const fontStyle_ = { 
  "family": "'Montserrat', sans-serif",
  "size": 14
};

const componentStyles_ = {
  'workspaceBackgroundColour': '#f8f8f8',
  'flyoutBackgroundColour': '#efefef',
  'flyoutForegroundColour': '#323232',
  'flyoutOpacity': 1,
  'scrollbarColour': '#ccc'
};

const blockStyles_ = {
  "procedure_blocks": {
      "colourPrimary": "#5a9359"
  },
  "logic_blocks": {
      "colourPrimary": "#0079c1"
  },
  "variable_blocks": {
    "colourPrimary": "#9081bc"
  },
  "variable_dynamic_blocks": {
    "colourPrimary": "#7461a8"
  },
}

export const Seshat = Blockly.Theme.defineTheme('seshat', {
  'blockStyles': blockStyles_,
  //'categoryStyles': Blockly.Themes.Classic.categoryStyles,
  'componentStyles': componentStyles_,
  'fontStyle': fontStyle_,
  'startHats': true
});

