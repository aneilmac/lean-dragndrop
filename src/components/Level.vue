<template>
  <div class="container" :style="sehatStyleConfig">
    <div class="level-title">{{levelData ? levelData.title : ''}}</div>
    <div class="level">
      <div class="goal-area">
        <div v-html="goalHtml" class="goals"/>
        <div v-html="propsHtml" class="props"/>
      </div>
      <LeanWorkspace 
        class="workspace" 
        v-bind:toolbox="completeToolbox" 
        v-bind:lemma-name="levelData ? levelData.lemma.name : ''" 
        v-bind:lemma-decl="levelData ? levelData.lemma.decl : ''" 
        v-bind:active-errors="formattedErrors" 
        ref="workspace" 
        v-on:codeChanged="updateCode" />
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { PropType } from 'vue/types/options';
import LeanWorkspace from '@/components/LeanWorkspace.vue';
import {LevelData, LevelToolbox} from '@/levelData';
import {calculateRowColumn, CodeChangedResult} from '@/codeUtils'
import {GoalChanged} from '@/goalWatcher';
import {Seshat} from '@/theme/seshat';

export default Vue.extend({
  name: 'Level',
  components: {
    LeanWorkspace
  },
  props: {
    levelData: Object as PropType<LevelData>,
    currentGoal: Object as PropType<GoalChanged>
  },
  data() {
    return {
      workspace_seq: 0,
      code: '',
    }
  },
  methods: {
    updateCode(code: string) {
      if (code === this.code)
        return;

      this.code = code;
      this.workspace_seq++;
      this.$emit('codeFileChanged', this.codeFile);
    }
  },
  watch: {
    levelData: function(newVal : LevelData, oldVal: LevelData) {
      if (newVal?.level_id === oldVal?.level_id)
        return;

      // TODO test if an event is emitted or we need to clear code ourselves here.
      //let workspace = this.$refs as InstanceType<typeof LeanWorkspace>;
      //workspace.clear();

      this.updateCode('');
    }
  },
  computed: {
    sehatStyleConfig: function() {
      return {
        backgroundColor: Seshat.componentStyles.workspaceBackgroundColour,
        color: Seshat.componentStyles.flyoutForegroundColour,
        fontFamily: Seshat.fontStyle.family,
        fontWeight: Seshat.fontStyle.weight,
        fontSize: `${Seshat.fontStyle.size}pt`
      };
    },
    goalHtml: function() : string {
      const goals = this.currentGoal.goals;

      const currentGoal = goals.length > 0 ? goals[0] : "No current goal";
      const remainingGoals = goals.slice(1).map((g) => `<li>${g}</li>`);
      if (remainingGoals.length === 0) {
        remainingGoals.push(`<li>No remaining goals</li>`);
      }

      return `
        <div class="goal-title">
          <span class="goalTitle">Current goal</span>
          <span>${currentGoal}</span>
        </div>
        <div class="goal-remainder">
          <span class="goalTitle">Remaining goals</span>
          <ol id="remainingGoalsList">
            ${remainingGoals.join('')}
          </ol>
        </div>`;
    },
    propsHtml: function() : string {
      const props = this.currentGoal.hypotheses;

      const propsList = props.map((p) => `<li>${p.expression} : ${p.expressionType}</li>`);
      if (propsList.length === 0) {
        propsList.push(`<li>None</li>`);
      }

      return `
        <div class="props-title"><span class="goalTitle">Active propositions</span></div>
        <div class="props-list">
          <ul>
            ${propsList.join('')}
          </ul>
        </div>`;
    },
    completeToolbox: function(): LevelToolbox {
      let props: string[] = [];
      
      if (this.levelData) {
        props = props.concat(this.levelData.toolbox.propositions);
      }

      for (const h of this.currentGoal.hypotheses) {
        props.push(`<block type='prop_dynamic' editable='false'><field name='PROP_NAME' id="${h.expression}">${h.expression}</field></block>`)
      }

      return {
        tactics: this.levelData ? this.levelData.toolbox.tactics : [],
        propositions: props
      }
    },
    codeFile: function() : CodeChangedResult {
      if (this.levelData) {
        let c = '';
        if (this.levelData.preamble) {
          c += this.levelData.preamble.join('\n');
          c += '\n';
        }

        c += 'set_option pp.structure_projections false\n';

        if (this.levelData.in_namespace) {
          c += `namespace ${this.levelData.in_namespace}\n`
        }

        c += `${this.code}`;
        const index = c.length - "\nend".length - 1;

        if (this.levelData.in_namespace) {
          c += `\nend ${this.levelData.in_namespace}`
        }

        const printstatement = `\n#print "EOF${this.workspace_seq}"\n`;
        const [row, column] = calculateRowColumn(c, index);
        return {
            codeFile: `${c}${printstatement}`,
            line: row, 
            column: column, 
            workspace_seq: this.workspace_seq
        }
      }

      return {
        codeFile: '',
        line: 1, 
        column: 0, 
        workspace_seq: this.workspace_seq
      }
    },
    formattedErrors: function () {
      let beginIndex = this.codeFile.codeFile.search(/^begin$/gm);
      let [line] = calculateRowColumn(this.codeFile.codeFile, beginIndex);
      return this.currentGoal.errors.map(e => {
        let f = Object.assign({}, e);
        f.line -= line + 1;
        return f;
      });
    }
  }
})
</script>

<style >
@import url('https://fonts.googleapis.com/css2?family=Montserrat&display=swap');
.container {
  display: grid; 
  grid-template-columns: 1fr; 
  grid-template-rows: 0.1fr 1.9fr; 
  gap: 0px 0px; 
  width: 100%; 
  height: 100%; 
}
.level-title {
  grid-area: 1 / 1 / 3 / 2; 
  text-align: right;
  font-size: 22px;
  margin-right: 2em;
}
.level {
  display: grid; 
  grid-template-columns: 0.7fr 1.3fr; 
  grid-template-rows: 1fr; 
  gap: 0px 0px; 
  grid-template-areas: 
    "goal-area workspace"; 
  grid-area: 2 / 1 / 3 / 2; 
}
.workspace { grid-area: workspace; }
.goal-area {
  display: grid; 
  grid-template-columns: 1fr; 
  grid-template-rows: 1fr 1fr; 
  gap: 0px 0px; 
  grid-template-areas: 
    "goals"
    "props"; 
  grid-area: goal-area; 
  text-align: center;
}
.goals {
  display: grid; 
  grid-template-columns: 1fr; 
  grid-template-rows: 0.2fr 1.8fr; 
  grid-template-areas: 
    "goal-title"
    "goal-remainder"; 
  grid-area: goals; 
  gap: 1em 1em; 
}
.goal-title { 
  grid-area: goal-title;
  font-weight: bold; 
}
.goal-remainder { grid-area: goal-remainder; }
.props {
  display: grid; 
  grid-template-columns: 1fr; 
  grid-template-rows: 0.2fr 1.8fr; 
  grid-template-areas: 
    "prop-title"
    "prop-list"; 
  grid-area: props; 
  gap: 1em 1em; 
}
.prop-title { grid-area: prop-title; }
.prop-list { grid-area: prop-list; }
.goalTitle {
  font-size: 20px;
  display: block;
}
</style>
