export interface LevelToolbox {
  tactics: string[];
  propositions: string[];
}

export interface Goal {
  goal: string;
  hypotheses: Hypothesis[];
}

export interface Hypothesis {
  expression: string;
  expressionType: string;
}

export interface Lemma {
  name: string;
  decl: string;
  variables: Hypothesis[];
}

export interface LevelData {
    level_id: string;
    title: string;
    preamble: [string] | undefined,
    in_namespace: string | undefined
    lemma: Lemma,
    toolbox: LevelToolbox
}

export const EMPTY_LEVEL : LevelData = {
  level_id: "",
  title: "", 
  preamble: undefined,
  in_namespace: undefined,
  lemma: {
    name: "",
    decl: "",
    variables: []
  },
  toolbox: {
    tactics: [],
    propositions: []
  }
}

export type Callback = (levelData: LevelData, err?: Error) => void;

export function readLevel(levelName: string, callback: Callback) {
  const url = window.location.origin;
  const request = new XMLHttpRequest();
  request.open("GET", `${url}/json/levels/${levelName}.json`, true);

  request.onload = function (this: XMLHttpRequest, _ev: ProgressEvent) {
    try {
      callback(JSON.parse(this.responseText));
    } catch(err) {
      callback(EMPTY_LEVEL, err);
    } 
  };
  
  request.onerror = function (this: XMLHttpRequest, _ev: ProgressEvent) {
    callback(EMPTY_LEVEL, Error(this.responseText));
  };

  request.send(null);
}

