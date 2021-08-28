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
import { GetWidgetRequest, AllMessagesResponse, InfoResponse } from 'lean-client-js-core';
import {CodeChangedResult} from '@/codeUtils'
import {GoalChanged, GoalWatcher} from '@/goalWatcher'
import {EMPTY_LEVEL, readLevel, LevelData} from '@/levelData';
import {Route} from 'vue-router';

const singleton_server = makeServer();

/**
 * A level is synonymous with a single lean file the user is currently 
 * interacting with. We manages a single "level" by initializing the lean server 
 * and processing all communications which arrive to and from the server with 
 * respect to the current level/lean file.
 */
export default Vue.extend({
  name: 'LevelManager',
  components: {
    Level
  },
  computed: {
    /**
     * The filename of the lean file we are currently interested in. This is 
     * `<currentLevelName>.lean` or an empty string if levelData is null.
     */
    fileName: function() : string {
      return this.levelData.level_id ? `${this.levelData.level_id}.lean` : '';
    }
  },
  data() {
    return {
      // The lean server itself which we are communicating with.
      server: singleton_server,
      // Our listener service for processing lean server communication.
      goalWatcher: new GoalWatcher(),
      // Metadata of the level
      levelData: EMPTY_LEVEL,
      // The current state of the level. Including the current goal to be 
      // solved, the nature of whether the user has completed the level, and 
      // all errors/warnings.
      currentGoal: {
        errors: [],
        goals: [],
        completed: false,
        hypotheses: [],
      } as GoalChanged
    }
  },
  mounted() {
    this.goalWatcher.callback = this.updateGoal;
    // TODO make errors more visible on level.
    this.server.error.on((err: any) => console.error('error:', err));
    // The `server.allMessages` is an event we listen to for the lifetime of the 
    // application, which will effectively spit out all errors/warnings/infos 
    // to do with lean file contents. We parse these messages to test level 
    // state.
    this.server.allMessages.on((allMessages: AllMessagesResponse) => {
      if (this.levelData.level_id) {
        this.goalWatcher.testAllMessages(allMessages);
      }
    });
  },
  beforeRouteEnter(to: Route, _from: Route, next) {
    // TODO: Make a property instead. Let's not handle this here.
    const levelName = to.params.id;
    readLevel(levelName, (levelData: LevelData, err?: Error) => {
      next((vm: any) => vm.setLevelData(levelData, err));
    });
  },
  methods: {
    /**
     * Call to change the current level to a different level by setting the 
     * metadata object.
     * @param levelData the contents of the level to manage.
     * @param err If set, the current level is cleared and an error is 
     * displayed. Used in cases where a level fails to load or does not exist.
     */
    setLevelData(levelData: LevelData, err?: Error) {
      if (err) {
        // TODO: Make visible in the level instead.
        this.levelData = levelData;
        console.error(err);
      } else {
        this.levelData = levelData;
      }
    },
    /**
     * When the blockly level emits a code update, we process it here.
     * When called, we update the lean server with the contents of `c` and we 
     * refresh our tracking the goal state.
     * @param c the code to send to the lean server to process.
     */
    syncCodeFile(c: CodeChangedResult) {
      console.log(c.codeFile);
      if (this.levelData.level_id) {
        // Reset watcher, we must prepare for new incoming changes.
        this.goalWatcher.startListen(c.workspace_seq);
        // Post the change to the lean server.
        const fileName = this.fileName;
        this.server.sync(fileName, c.codeFile);
        // Re-query the server for any goal changes after the sync.
        this.server.info(this.fileName, c.line, c.column)
          .then((value: InfoResponse) => {
            const widget = value.record?.widget;
            if (widget && widget.id) {
                // Our INFO attempt came back with a widget id, so 
                // there is additional widget data retrieval before passing 
                // all data back to the goalWatcher.
                const request: GetWidgetRequest = { 
                  command: 'get_widget',
                  file_name: fileName,
                  line: widget.line,
                  column: widget.column,
                  id: widget.id
                };
                this.server.send(request).then(e => {
                  this.goalWatcher.testInfoResponse(value, e.widget.html);
                }).catch(e => console.log(e));
              } else {
                // Our INFO attempt came back without a widget id. So we process
                // the goals without associated widget data.
                this.goalWatcher.testInfoResponse(value);
              }
            }
          ).catch((err: Error) => console.error(err));
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
