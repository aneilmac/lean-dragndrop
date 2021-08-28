<template>
<div class="goal-area">
  <div class="goals">
    <div class="goal-title">
      <div class="goalTitle">Current goal</div>
      <div>{{currentGoal}}</div>
    </div>
    <div class="goal-remainder">
      <span class="goalTitle">{{remainingGoalsTitle}}</span>
      <ol id="remainingGoalsList">
        <li v-for="goal in remainingGoals" :key="goal">
          {{goal}}
        </li>
      </ol>
    </div>
  </div>
  <div class="props">
    <div class="props-title">
      <span class="goalTitle">Active propositions</span>
    </div>
    <div class="props-list">
      <ul v-for="prop in propositions" :key="prop.expression">
        {{prop.expression}} : {{prop.expressionType}}
      </ul>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import {PropType} from 'vue/types/options';
import {Hypothesis} from '@/goalWatcher';

export default Vue.extend({
  name: 'GoalArea',
  props: {
    goals: Array as PropType<string[]>,
    propositions: Array as PropType<Hypothesis[]>
  },
  methods: {
  },
  computed: {
    currentGoal: function() : string {
      return this.goals.length > 0 ? this.goals[0] : "None"
    },
    remainingGoalsTitle: function() : string {
      return  this.goals.length === 0 ? "" :
              this.goals.length === 1 ? "No remaining goals" :
              "Remaining goals"
    },
    remainingGoals: function() : string[] {
      return this.goals.slice(1);
    },
  }
})
</script>

<style scoped>
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
