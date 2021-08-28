import * as Blockly from 'blockly';

export interface LevelToolbox {
  tactics: string[],
  propositions: string[]
}

export interface _LevelData {
    level_id: string,
    title: string,
    preamble: [string] | undefined,
    in_namespace: string | undefined
    lemma: {
      name: string,
      decl: string
    },      
    toolbox: LevelToolbox
}

export type LevelData = _LevelData | null;

export type Callback = (levelData: LevelData, err?: Error) => void;

export function readLevel(levelName: string, callback: Callback) {
  const url = window.location.origin;
  const request = new XMLHttpRequest();
  request.open("GET", `${url}/json/levels/${levelName}.json`, true);

  request.onload = function (this: XMLHttpRequest, _ev: ProgressEvent) {
    try {
      callback(JSON.parse(this.responseText));
    } catch(err) {
      callback(null, err);
    } 
  };
  
  request.onerror = function (this: XMLHttpRequest, _ev: ProgressEvent) {
    callback(null, Error(this.responseText));
  };

  request.send(null);
}

