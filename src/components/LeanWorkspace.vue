<template>
  <div class="blocklyDiv" ref="blocklyDiv" />
</template>

<script lang="ts">
import Vue from 'vue';
import * as Blockly from 'blockly';
import {Generator, defineBlocks} from '@aneilmac/blockly-plugin-lean';
import { PropType } from 'vue/types/options';
import {WorkspaceError} from '@/goalWatcher';
import {Hypothesis, Lemma, LevelToolbox} from '@/levelData';
import {Seshat} from '@/theme/seshat';

defineBlocks(Blockly);

const VARIABLES_ID = "=.;oGfZ!+bEEDS|x5O}7";
const LEMMA_ID = "gZF[37BYC:SUBO(#@0([";

export default Vue.extend({
  name: 'LeakWorkspace',
  props: {
    toolbox: Object as PropType<LevelToolbox>,
    lemma: Object as PropType<Lemma>,
    activeErrors: Array as PropType<WorkspaceError[]>
  },
  data(){
    return {
      options: {
        media: 'media/',
        renderer: "thrasos",
        toolbox: {
          kind: "",
          contents: []
        },
        theme: Seshat,
      } as Blockly.BlocklyOptions,
      workspace: null as Blockly.WorkspaceSvg | null,
    }
  },
  computed: {
    initialWorkspaceDOM: function() {
      return `
      <xml>
        <block type="variables" deletable="false" editable="false" id="${VARIABLES_ID}">
          <statement name="VARIABLES">
            ${generateVariableBlocks_(this.lemma.variables)}
          </statement>
          <next>
            <block type="lemma" editable="false" movable="false" id="${LEMMA_ID}">
              <field name="THEOREM_NAME">${this.lemma.name}</field>
              <field name="THEOREM_DECLARATION">${this.lemma.decl}</field>
              <data>nat_num_game</data>
            </block>
          </next>
        </block>
      </xml>`;
    }
  },
  mounted() {
    let div = this.$refs["blocklyDiv"];
    if (div instanceof Element) {
      this.workspace = Blockly.inject(div, this.options);

      // Disable anything not added to the lemma specifically.
      this.workspace.addChangeListener(Blockly.Events.disableOrphans);

      // Inject the lemma into the workspace.
      this.updateWorkspace();
    }

    this.workspace?.addChangeListener((event : any) => {
       const emitCodeChange = () => {
         const code = Generator.workspaceToCode(this.workspace as Blockly.Workspace);
          this.$emit('codeChanged', code);
       }

       switch(event.type) {
         case Blockly.Events.BLOCK_DELETE: {
            emitCodeChange();
            break;
         }
         case Blockly.Events.BLOCK_MOVE: {
            // Ignore anything that is not parented to top level item.
            if (event.newParentId) {
              emitCodeChange();
            }
            break;
         }
         case Blockly.Events.BLOCK_CHANGE: {
           if (['field', 'disabled', 'mutation'].includes(event.element)) {
             emitCodeChange();
           }
           break;
         }
         default: 
          break;
       }
    });
  },
  watch: {
    toolbox: function(newTools: LevelToolbox) {
      let blocks = `<xml>${newTools.tactics.join('') + newTools.propositions.join('')}</xml>`;
      this.workspace?.updateToolbox(blocks);
    },
    lemma: function() { this.updateWorkspace(); },
    activeErrors: function(newVal: WorkspaceError[]) {
      if (this.workspace) {
        const lemmaBlock = this.workspace.getBlockById(LEMMA_ID);

        // Collect all statement blocks.
        let statements = [];
        let currentStatement = lemmaBlock.getInputTargetBlock('LEMMA_PROOF');
        while (currentStatement != null)
        {
          statements.push(currentStatement);
          currentStatement = currentStatement.getNextBlock();
        }

        // Clear out old warnings.
        lemmaBlock.setWarningText(null as any);
        for (const s of statements) {
          s.setWarningText(null as any);
        }

        // Apply new warning messages to each statement block we find.
        let unique_id = 0;
        for (const error of newVal) {
          const lineIndex = error.line;
          if (lineIndex < 0 || lineIndex >= statements.length) {
            lemmaBlock.setWarningText(error.message, unique_id.toString());
          } else {
            const child = statements[lineIndex];
            child.setWarningText(error.message, unique_id.toString());
          }
          unique_id++;
        }
      }
    }
  },
  methods: {
    updateWorkspace() {
      if (this.workspace) {
        this.workspace.clear();
        Blockly.Xml.domToWorkspace(
          Blockly.Xml.textToDom(this.initialWorkspaceDOM), 
          this.workspace as Blockly.Workspace);
      }
    }
  }
})

function generateVariableBlocks_(vs: Hypothesis[]) : string {
  return vs.reduceRight(
        (p: string, c: Hypothesis) => {
          return `
          <block type="prop_declaration" editable="false" movable="false">
            <field name="VARIABLE_DECL">${c.expression}</field>
            <field name="VARIABLE_DEF">${c.expressionType}</field>
            <next>${p}</next>
          </block>`;
        },
        ''
      );
}

</script>
