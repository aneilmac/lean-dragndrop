<template>
  <div class="container">
      <pre id="goalArea">{{currentGoal.goal}}</pre>
      <LeanWorkspace 
        class="workspace" 
        v-bind:toolbox="levelData ? levelData.toolbox : null" 
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
import {LevelData} from '@/levelData';
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
    },
    currentGoal: function() {
      console.log("CG", this.currentGoal);
    }
  },
  computed: {
    codeFile: function() : CodeChangedResult {
      if (this.levelData) {
        let c = '';
        if (this.levelData.preamble) {
          c += this.levelData.preamble + '\n';
        }

        c += `${this.code}`;
        const index = c.length - "\nend".length - 1;
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
#goalArea { grid-area: goal-area; }
</style>
