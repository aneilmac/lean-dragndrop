import { AllMessagesResponse, Message, InfoResponse, WidgetHtml, WidgetElement, WidgetComponent } from 'lean-client-js-core';
import { Goal } from './levelData';
import { iterateGoals } from './parseWidgetHTML';

export interface WorkspaceError {
  line: number,
  message: string
}

export interface GoalChanged {
  errors: WorkspaceError[],
  goals: Goal[],
  completed: boolean
}

export type CallbackType = ((goals: GoalChanged) => void) | undefined;

export class GoalWatcher {
  lean_seq = 0;
  workspace_seq = 0;

  currentGoal: GoalChanged = {
    errors: [],
    goals: [],
    completed: false
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
      completed: false
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
      this.currentGoal.goals = [...iterateGoals(widget)];
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
