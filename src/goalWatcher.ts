import { AllMessagesResponse, Message, InfoResponse } from 'lean-client-js-core';

function isEOFMessage(message: Message) {
  return message.severity === "information" && 
         message.caption === "print result" &&
         message.text.startsWith("EOF");
}

function getEOFNumber(eofStr: string) : number {
  return Number.parseInt(eofStr.slice(3));
}

export interface WorkspaceError {
  line: number,
  message: string
}

export interface GoalChanged {
  errors: WorkspaceError[],
  goal: string
  completed: boolean
}

export type CallbackType = ((goals: GoalChanged) => void) | undefined;

export class GoalWatcher {
  lean_seq = 0;
  workspace_seq = 0;

  errorMessages: WorkspaceError[] = [];
  goal = '';

  tests_run = false;
  infos_run = false;

  callback: CallbackType = undefined;

  startListen(worspaceSeq: number) {
    this.errorMessages = [];
    this.goal = '';
    this.workspace_seq = worspaceSeq;

    this.tests_run = false;
    this.infos_run = false;
  }

  emitStateChange() {
    if (this.callback) {
      const goal_reached = this.goal === 'no goals';
      this.callback({
        goal: this.goal,
        completed: goal_reached && this.errorMessages.length === 0,
        errors: this.errorMessages
      });
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
          this.errorMessages.push({
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

  testInfoResponse(infoResponse: InfoResponse) {
    const record = infoResponse.record;
    if (record) {
      // Only interested in the latest message.
      if (infoResponse.seq_num > this.lean_seq) {
        this.lean_seq = infoResponse.seq_num;
        if (record.state)
          this.goal = record.state;
      }
    } else {
      this.goal = '';
    }

    this.infos_run = true;
    if (this.tests_run) {
      this.emitStateChange();
    }
  }
}
