import { WidgetHtml, WidgetElement } from 'lean-client-js-core';
import { Goal, Hypothesis } from './levelData';

export function* iterateGoals(w: WidgetHtml) : Generator<Goal> {
  let hyps: Hypothesis[] = [];
  
  const k = iterateElements(w);
  let e = k.next();
  while (!e.done) {
    // Collect any hypotheses from the element
    const hs = [...iterateHypotheses(e.value)];
    // If the element has hypotheses, we add to our list and continue without
    // checking child elements.
    if (hs.length > 0) {
      hyps = hyps.concat(hs);
      e = k.next(false);
    } else {
      // If no hypotheses were found, test if we are a goal item, if so yield
      // the goal with the current hypothesis list. Then reset hypotheses for 
      // next round.
      const g = getGoalItem(e.value);
      if (g) {
        yield { goal: g, hypotheses: hyps};
        hyps = [];
        e = k.next(false);
      } else {
        // We found nothing. Recurse through children.
        e = k.next(true);
      }
    }
  }
}

function getGoalItem(w: WidgetElement) : string {
  if (w.t === "li") {
    for (const c of w.c) {
      if (isWidgetElement(c)) {
        const isVDash = isGoalVDash(c);
        if (isVDash) { 
          return getContent(w);
        }
      }
    }
  }
  return '';
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

function* iterateHypotheses(w: WidgetElement) : Generator<Hypothesis> {
  if (w.t === "li") {
    for (const c of w.c) {
      if (isWidgetElement(c)) {
        const hyp = getGoalHyp(c);
        if (hyp !== '') { 
          hypLoop:
          for (const q of w.c) {
            if (isWidgetElement(q) && q.a) {
              for (const [k, v] of Object.entries(q.a)) {
                if (k === 'className' && 
                    JSON.stringify(v).includes('goal-hyp-type')) {
                  const content = getContent(q);
                  yield { expression: hyp, expressionType: content };
                  break hypLoop;
                }
              }
            }
          }
        }
      }
    }
  }
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

function getContent(w: WidgetElement) : string {
  let s = '';
  for (const h of iterateElements(w)) {
    if (h.c.length === 1) {
      const c = h.c[0];
      if (typeof c === 'string')
        s += c;
    }
  }
  return s;
}

function* iterateElements(w: WidgetHtml) : Generator<WidgetElement> {
  if (isWidgetElement(w)) {
    const recursive = yield w;

    // Recursive when unset defaults to true.
    if (recursive === undefined || recursive === true) {
      for (const wc of w.c) {
        yield* iterateElements(wc);
      }
    }
  } else if (typeof w === 'object' && w !== null) {
    for (const wc of w.c) {
      yield* iterateElements(wc);
    }
  }
}

function isWidgetElement(w: WidgetHtml): w is WidgetElement {
  return (typeof w === 'object') && (w as any).t;
}
