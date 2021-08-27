import { AllMessagesResponse, Message, InfoResponse, WidgetHtml, WidgetElement, WidgetComponent } from 'lean-client-js-core';

export interface Hypothesis {
  expression: string
  expressionType: string,
}

export interface WorkspaceError {
  line: number,
  message: string
}

export interface GoalChanged {
  errors: WorkspaceError[],
  goals: string[],
  completed: boolean,
  hypotheses: Hypothesis[]
}

export type CallbackType = ((goals: GoalChanged) => void) | undefined;

export class GoalWatcher {
  lean_seq = 0;
  workspace_seq = 0;

  currentGoal: GoalChanged = {
    errors: [],
    goals: [],
    completed: false,
    hypotheses: []
  }

  has_no_goals_message: boolean = false;
  tests_run = false;
  infos_run = false;

  callback: CallbackType = undefined;

  startListen(worspaceSeq: number) {
    this.workspace_seq = worspaceSeq;
    this.currentGoal = {
      errors: [],
      goals: [],
      completed: false,
      hypotheses: []
    }
    this.has_no_goals_message = false;
    this.tests_run = false;
    this.infos_run = false;
  }

  emitStateChange() {
    if (this.callback) {
      this.currentGoal.completed = this.currentGoal.goals.length === 0 && 
                                   this.currentGoal.errors.length === 0 &&
                                   this.has_no_goals_message;
      this.callback(this.currentGoal);
    }
  }

  /**
   * We must do two things: 
   * The first is guarnatee no warnings or errors appear in the errors list.
   * The second is to verify the messages coincide with the latest well known 
   * sequence number of the workspace.
   */
  testAllMessages(allMessages: AllMessagesResponse) {
    let seq = 0;
    
    for (const message of allMessages.msgs) {
      if (isEOFMessage(message)) {
        seq = getEOFNumber(message.text);
        break;
      }
    }

    if (seq === this.workspace_seq) {
      for (const message of allMessages.msgs) {
        if (message.severity !== 'information') {
          this.currentGoal.errors.push({
            line: message.pos_line,
            message: message.text
          });
        }
      }
      
      this.tests_run = true;
      if (this.infos_run) {
        this.emitStateChange();
      }
    }
  }

  testInfoResponse(infoResponse: InfoResponse, widget?: WidgetComponent) {
    const record = infoResponse.record;
    
    if (widget) {
      this.currentGoal.goals = getAllGoals(widget);
      this.currentGoal.hypotheses = getAllHypotheses(widget);
    }

    if (record) {
      // Only interested in the latest message.
      if (infoResponse.seq_num > this.lean_seq) {
        this.lean_seq = infoResponse.seq_num;
        this.has_no_goals_message = record.state === 'no goals';
      }
    }

    this.infos_run = true;
    if (this.tests_run) {
      this.emitStateChange();
    }
  }
}

function isEOFMessage(message: Message) {
  return message.severity === "information" && 
         message.caption === "print result" &&
         message.text.startsWith("EOF");
}

function getEOFNumber(eofStr: string) : number {
  return Number.parseInt(eofStr.slice(3));
}

function getAllHypotheses(w: WidgetHtml): Hypothesis[] {
  let hyps: Hypothesis[] = [];
  const getAllHypotheses_ = function(h: WidgetElement) {
    const g = getHypothesisFor(h);
    if (g.length > 0) {
      hyps = hyps.concat(g);
      return false;
    }
    return true;
  }
  processWidgetHtml(getAllHypotheses_, w);
  return hyps;
}

function getHypothesisFor(w: WidgetElement) : Hypothesis[] {
  const hyps: Hypothesis[] = [];
  if (w.t === "li") {
    for (const c of w.c) {
      if (isWidgetElement(c)) {
        const hyp = getGoalHyp(c);
        if (hyp !== '') { 
          for (const q of w.c) {
            if (isWidgetElement(q) && q.a) {
              for (const [k, v] of Object.entries(q.a)) {
                if (k === 'className' && JSON.stringify(v).includes('goal-hyp-type')) {
                  const content = getContent(q);
                  hyps.push({
                    expression: hyp,
                    expressionType: content
                  });
                  break;
                }
              }
            }
          }
        }
      }
    }
  }
  return hyps;
}

function getGoalHyp(w: WidgetElement) : string {
  if (w.t === 'span' && w.a) {
    for (const [k, v] of Object.entries(w.a)) {
      if (k === 'className' && JSON.stringify(v).includes('goal-hyp')) {
        if (w.c.length === 1) {
          const c = w.c[0];
          if (typeof c === 'string')
          return c;
        }
      }
    }
  }
  return '';
}

function getAllGoals(w: WidgetHtml): string[] {
  let goals: string[] = [];
  const getAllGoals_ = function(h: WidgetElement) {
    const g = getGoalsFor(h);
    if (g.length > 0) {
      goals = goals.concat(g);
      return false;
    }
    return true;
  }
  processWidgetHtml(getAllGoals_, w);
  return goals;
}

function getGoalsFor(w: WidgetElement) : string[] {
  const goals: string[] = [];
  if (w.t === "li") {
    for (const c of w.c) {
      if (isWidgetElement(c)) {
        const isVDash = isGoalVDash(c);
        if (isVDash) { 
          goals.push(getContent(w));
        }
        break;
      }
    }
  }
  return goals;
}

function isGoalVDash(w: WidgetElement) : boolean {
  if (w.t === 'span' && w.a) {
    for (const [k, v] of Object.entries(w.a)) {
      if (k === 'className' && JSON.stringify(v).includes('goal-vdash')) {
        if (w.c.length === 1) {
          const c = w.c[0];
          if (typeof c === 'string')
          return c === "⊢ ";
        }
      }
    }
  }
  return false;
}

function getContent(w: WidgetElement) : string {
  let s = '';
  const getContent_ = (h: WidgetElement) => {
    if (h.c.length === 1) {
      const c = h.c[0];
      if (typeof c === 'string')
        s += c;
    }
    return true;
  };
  processWidgetHtml(getContent_, w);
  return s;
}

type ProcessElementFn = (w: WidgetElement) => boolean; 

function processWidgetHtml(f: ProcessElementFn, w: WidgetHtml) {
  if (isWidgetElement(w)) {
    const result = f(w);
    if (result) {
      for (const wc of w.c) {
        processWidgetHtml(f, wc);
      }
    }
  } else if (typeof w === 'object' && w !== null) {
    for (const wc of w.c) {
      processWidgetHtml(f, wc);
    }
  }
}

function isWidgetElement(w: WidgetHtml): w is WidgetElement {
  return (typeof w === 'object') && (w as any).t;
}
