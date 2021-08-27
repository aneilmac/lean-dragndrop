<template>
  <div class="container">
      <pre id="goalArea">
Completed: {{currentGoal.completed}}

{{currentGoal.goals.join('\n')}}

{{currentGoal.hypotheses.map(x => `${x.expression} : ${x.expressionType}`).join('\n')}}
      </pre>
      <LeanWorkspace 
        id="workspace" 
        v-bind:toolbox="completeToolbox" 
        v-bind:lemma-name="levelData ? levelData.lemma.name : ''" 
        v-bind:lemma-decl="levelData ? levelData.lemma.decl : ''" 
        v-bind:active-errors="formattedErrors" 
        ref="workspace" 
        v-on:codeChanged="updateCode" />
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { PropType } from 'vue/types/options';
import LeanWorkspace from '@/components/LeanWorkspace.vue';
import {LevelData, LevelToolbox} from '@/levelData';
import {calculateRowColumn, CodeChangedResult} from '@/codeUtils'
import {GoalChanged} from '@/goalWatcher';

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
    completeToolbox: function(): LevelToolbox {
      let props: string[] = [];
      
      if (this.levelData) {
        props = props.concat(this.levelData.toolbox.propositions);
      }

      for (const h of this.currentGoal.hypotheses) {
        props.push(`<block type='prop' editable='false'><field name='PROP_NAME' id="${h.expression}">${h.expression}</field></block>`)
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

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=STIX+Two+Math&display=swap');

.container {
  display: grid; 
  grid-auto-flow: row dense; 
  grid-auto-rows: 1fr; 
  grid-template-columns: 1fr 1fr; 
  grid-template-rows: 1fr; 
  gap: 0px 0px; 
  grid-template-areas: 
    "goal-area ."; 
  width: 100%;
  height: 100%;
}
#workspace {
  justify-self: stretch; 
  grid-area: 1; 
}
#goalArea { 
  grid-area: goal-area; 
  font-family: 'STIX Two Math', serif;
  font-size: 20px;
  display: flex;
  justify-content: center;
}
</style>
