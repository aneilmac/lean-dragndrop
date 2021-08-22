<template>
  <Level 
  v-bind:level-data="levelData" 
  v-bind:current-goal="currentGoal"
  v-on:codeFileChanged="syncCodeFile"/>
</template>

<script lang="ts">
import Vue from 'vue';
import Level from '@/components/Level.vue';
import makeServer from '@/makeServer';
import { AllMessagesResponse, InfoResponse } from 'lean-client-js-core';
import {CodeChangedResult} from '@/codeUtils'
import {GoalChanged, GoalWatcher} from '@/goalWatcher'
import {readLevel, LevelData} from '@/levelData';
import {Route} from 'vue-router';

const singleton_server = makeServer();

export default Vue.extend({
  name: 'LevelManager',
  components: {
    Level
  },
  computed: {
    fileName: function() {
      return `${(this as any).levelData.level_id}.lean`;
    }
  },
  data() {
    return {
      levelData: null as LevelData,
      goalWatcher: new GoalWatcher(),
      currentGoal: {
        errors: [],
        goal: "",
        completed: false
      } as GoalChanged,
      server: singleton_server
    }
  },
  mounted() {
    this.goalWatcher.callback = this.updateGoal;
    this.server.error.on((err: any) => console.error('error:', err));
    this.server.allMessages.on((allMessages: AllMessagesResponse) => {
      if (this.levelData) {
        this.goalWatcher.testAllMessages(allMessages);
      }
    });
  },
  beforeRouteEnter(to: Route, _from: Route, next) {
    const levelName = to.params.id;
    readLevel(levelName, (levelData: LevelData, err?: Error) => {
      next((vm: any) => vm.setLevelData(levelData, err));
    });
  },
  methods: {
    setLevelData(levelData: LevelData, err?: Error) {
      if (err) {
        console.error(err);
      } else {
        this.levelData = levelData;
      }
    },
    syncCodeFile(c: CodeChangedResult) {
      if (this.levelData) {
        this.goalWatcher.startListen(c.workspace_seq);
        this.server.sync(this.fileName, c.codeFile);
        this.server.info(this.fileName, c.line, c.column)
          .then((value: InfoResponse) => {
            this.goalWatcher.testInfoResponse(value);
          })
          .catch((err: Error) => console.error(err));
      }
    },
    updateGoal(g: GoalChanged) {
      this.currentGoal = g;
    }
  }
})
</script>

<style>
</style>
