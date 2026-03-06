import { useEffect, useRef } from "react";

const BOT_TOOLBOX = `
<xml>
  <category name="Bot" colour="#1E5BD8">
    <block type="lido_bot"></block>
    <block type="lido_keyword"></block>
    <block type="lido_intent"></block>
    <block type="lido_response"></block>
  </category>
  <category name="Forms" colour="#2563EB">
    <block type="lido_form"></block>
    <block type="lido_form_field"></block>
  </category>
  <category name="Tables" colour="#0EA5E9">
    <block type="lido_table"></block>
    <block type="lido_table_column"></block>
    <block type="lido_table_row"></block>
  </category>
  <category name="Application" colour="#0F74DA">
    <block type="lido_app_response"></block>
    <block type="lido_app_component"></block>
  </category>
  <category name="Dynamic" colour="#0B6FB6">
    <block type="lido_dyn_layout_init"></block>
    <block type="lido_dyn_set"></block>
    <block type="lido_dyn_for_each"></block>
    <block type="lido_dyn_push_component"></block>
    <block type="lido_dyn_push_component_expr"></block>
    <block type="lido_dyn_set_layout_expr"></block>
    <block type="lido_dyn_set_message_expr"></block>
  </category>
  <category name="Helpers" colour="#0B6FB6">
    <block type="lido_helper_fetch"></block>
    <block type="lido_helper_db_select"></block>
    <block type="lido_helper_db_aggregate"></block>
    <block type="lido_helper_js"></block>
  </category>
</xml>
`;

interface BlocklyEditorProps {
  initialXml?: string;
  onXmlChange?: (xml: string) => void;
  onCodeChange?: (code: string) => void;
  onPreviewChange?: (preview: any) => void;
  onDiagnosticsChange?: (diagnostics: BlocklyDiagnostic[]) => void;
}

export interface BlocklyDiagnostic {
  severity: "error" | "warning";
  message: string;
  blockType?: string;
}

function defineBlocks(Blockly: any) {
  Blockly.defineBlocksWithJsonArray([
    {
      type: "lido_bot",
      message0: "Bot name %1 version %2",
      args0: [
        { type: "field_input", name: "NAME", text: "My Bot" },
        { type: "field_input", name: "VERSION", text: "1.0.0" },
      ],
      message1: "keywords %1",
      args1: [{ type: "input_statement", name: "KEYWORDS" }],
      message2: "intents %1",
      args2: [{ type: "input_statement", name: "INTENTS" }],
      colour: "#1E5BD8",
      tooltip: "Define bot metadata, keywords and intents",
    },
    {
      type: "lido_keyword",
      message0: "keyword %1 phrases (csv) %2",
      args0: [
        { type: "field_input", name: "KEY", text: "account_help" },
        { type: "field_input", name: "PHRASES", text: "help, support, start" },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#1E5BD8",
      tooltip: "Map keyword to a list of phrases",
    },
    {
      type: "lido_intent",
      message0: "intent %1",
      args0: [{ type: "field_input", name: "INTENT", text: "init" }],
      message1: "response %1",
      args1: [{ type: "input_value", name: "RESPONSE" }],
      previousStatement: null,
      nextStatement: null,
      colour: "#1E5BD8",
      tooltip: "Define an intent and its response",
    },
    {
      type: "lido_response",
      message0: "message %1",
      args0: [{ type: "field_input", name: "MESSAGE", text: "Hello!" }],
      message1: "suggestions (csv) %1",
      args1: [{ type: "field_input", name: "SUGGESTIONS", text: "Help, Contact support" }],
      message2: "actions (csv) %1",
      args2: [{ type: "field_input", name: "ACTIONS", text: "View account, Reset password" }],
      message3: "metadata (json) %1",
      args3: [{ type: "field_input", name: "METADATA", text: "{}" }],
      message4: "form %1",
      args4: [{ type: "input_statement", name: "FORM" }],
      message5: "table %1",
      args5: [{ type: "input_statement", name: "TABLE" }],
      message6: "helpers %1",
      args6: [{ type: "input_statement", name: "HELPERS" }],
      output: null,
      colour: "#1E5BD8",
    },
    {
      type: "lido_app_response",
      message0: "app response message %1",
      args0: [{ type: "field_input", name: "MESSAGE", text: "" }],
      message1: "layout %1",
      args1: [{ type: "input_statement", name: "LAYOUT" }],
      message2: "helpers %1",
      args2: [{ type: "input_statement", name: "HELPERS" }],
      output: null,
      colour: "#0F74DA",
      tooltip: "Define an application response with layout",
    },
    {
      type: "lido_app_component",
      message0: "component %1 config (json) %2",
      args0: [
        {
          type: "field_dropdown",
          name: "TYPE",
          options: [
            ["stat_card", "stat_card"],
            ["data_table", "data_table"],
            ["chart", "chart"],
            ["form", "form"],
            ["action_button", "action_button"],
            ["alert", "alert"],
            ["text", "text"],
            ["divider", "divider"],
            ["grid", "grid"],
            ["tabs", "tabs"],
            ["timeline", "timeline"],
            ["image", "image"],
            ["list", "list"],
          ],
        },
        { type: "field_input", name: "CONFIG", text: "{}" },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#0F74DA",
      tooltip: "Add an AppRenderer component via JSON config",
    },
    {
      type: "lido_helper_fetch",
      message0: "fetch url %1 method %2 assign to %3",
      args0: [
        { type: "field_input", name: "URL", text: "https://api.example.com" },
        { type: "field_dropdown", name: "METHOD", options: [["GET", "GET"], ["POST", "POST"], ["PUT", "PUT"], ["DELETE", "DELETE"]] },
        { type: "field_input", name: "VAR", text: "apiResult" },
      ],
      message1: "headers (json) %1",
      args1: [{ type: "field_input", name: "HEADERS", text: "{}" }],
      message2: "body (json) %1",
      args2: [{ type: "field_input", name: "BODY", text: "{}" }],
      previousStatement: null,
      nextStatement: null,
      colour: "#0B6FB6",
    },
    {
      type: "lido_helper_db_select",
      message0: "db select table %1 columns (csv) %2 assign to %3",
      args0: [
        { type: "field_input", name: "TABLE", text: "users" },
        { type: "field_input", name: "COLUMNS", text: "*" },
        { type: "field_input", name: "VAR", text: "rows" },
      ],
      message1: "where (json) %1",
      args1: [{ type: "field_input", name: "WHERE", text: "{}" }],
      message2: "options (json) %1",
      args2: [{ type: "field_input", name: "OPTIONS", text: "{}" }],
      previousStatement: null,
      nextStatement: null,
      colour: "#0B6FB6",
    },
    {
      type: "lido_helper_db_aggregate",
      message0: "db aggregate table %1 aggregations (json) %2 assign to %3",
      args0: [
        { type: "field_input", name: "TABLE", text: "orders" },
        { type: "field_input", name: "AGG", text: "{\"total\": \"COUNT(*)\"}" },
        { type: "field_input", name: "VAR", text: "stats" },
      ],
      message1: "where (json) %1",
      args1: [{ type: "field_input", name: "WHERE", text: "{}" }],
      previousStatement: null,
      nextStatement: null,
      colour: "#0B6FB6",
    },
    {
      type: "lido_helper_js",
      message0: "js line %1",
      args0: [{ type: "field_input", name: "CODE", text: "// code" }],
      previousStatement: null,
      nextStatement: null,
      colour: "#0B6FB6",
    },
    {
      type: "lido_dyn_layout_init",
      message0: "init layout var %1",
      args0: [{ type: "field_input", name: "TARGET", text: "layout" }],
      previousStatement: null,
      nextStatement: null,
      colour: "#0B6FB6",
    },
    {
      type: "lido_dyn_set",
      message0: "set %1 = %2",
      args0: [
        { type: "field_input", name: "VAR", text: "value" },
        { type: "field_input", name: "EXPR", text: "0" },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#0B6FB6",
    },
    {
      type: "lido_dyn_for_each",
      message0: "for each %1 in %2",
      args0: [
        { type: "field_input", name: "ITEM", text: "item" },
        { type: "field_input", name: "LIST", text: "[]" },
      ],
      message1: "do %1",
      args1: [{ type: "input_statement", name: "DO" }],
      previousStatement: null,
      nextStatement: null,
      colour: "#0B6FB6",
    },
    {
      type: "lido_dyn_push_component",
      message0: "push component %1 to %2 config (json) %3",
      args0: [
        {
          type: "field_dropdown",
          name: "TYPE",
          options: [
            ["stat_card", "stat_card"],
            ["data_table", "data_table"],
            ["chart", "chart"],
            ["form", "form"],
            ["action_button", "action_button"],
            ["alert", "alert"],
            ["text", "text"],
            ["divider", "divider"],
            ["grid", "grid"],
            ["tabs", "tabs"],
            ["timeline", "timeline"],
            ["image", "image"],
            ["list", "list"],
          ],
        },
        { type: "field_input", name: "TARGET", text: "layout" },
        { type: "field_input", name: "CONFIG", text: "{}" },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#0B6FB6",
    },
    {
      type: "lido_dyn_push_component_expr",
      message0: "push component %1 to %2 config expr %3",
      args0: [
        {
          type: "field_dropdown",
          name: "TYPE",
          options: [
            ["stat_card", "stat_card"],
            ["data_table", "data_table"],
            ["chart", "chart"],
            ["form", "form"],
            ["action_button", "action_button"],
            ["alert", "alert"],
            ["text", "text"],
            ["divider", "divider"],
            ["grid", "grid"],
            ["tabs", "tabs"],
            ["timeline", "timeline"],
            ["image", "image"],
            ["list", "list"],
          ],
        },
        { type: "field_input", name: "TARGET", text: "layout" },
        { type: "field_input", name: "EXPR", text: "{ rows: rows }" },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#0B6FB6",
    },
    {
      type: "lido_dyn_set_layout_expr",
      message0: "set layout = %1",
      args0: [{ type: "field_input", name: "EXPR", text: "[]" }],
      previousStatement: null,
      nextStatement: null,
      colour: "#0B6FB6",
    },
    {
      type: "lido_dyn_set_message_expr",
      message0: "set message = %1",
      args0: [{ type: "field_input", name: "EXPR", text: "Ready" }],
      previousStatement: null,
      nextStatement: null,
      colour: "#0B6FB6",
    },
    {
      type: "lido_form",
      message0: "form title %1 submit %2 cancel %3",
      args0: [
        { type: "field_input", name: "TITLE", text: "Form Title" },
        { type: "field_input", name: "SUBMIT", text: "Submit" },
        { type: "field_input", name: "CANCEL", text: "Cancel" },
      ],
      message1: "fields %1",
      args1: [{ type: "input_statement", name: "FIELDS" }],
      previousStatement: null,
      nextStatement: null,
      colour: "#2563EB",
    },
    {
      type: "lido_form_field",
      message0: "field %1 name %2 label %3 required %4 options (csv) %5",
      args0: [
        {
          type: "field_dropdown",
          name: "TYPE",
          options: [
            ["text", "text"],
            ["email", "email"],
            ["password", "password"],
            ["textarea", "textarea"],
            ["select", "select"],
            ["checkbox", "checkbox"],
          ],
        },
        { type: "field_input", name: "NAME", text: "field_name" },
        { type: "field_input", name: "LABEL", text: "Field Label" },
        { type: "field_checkbox", name: "REQUIRED", checked: false },
        { type: "field_input", name: "OPTIONS", text: "Option A, Option B" },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#2563EB",
    },
    {
      type: "lido_table",
      message0: "table title %1",
      args0: [{ type: "field_input", name: "TITLE", text: "Table Title" }],
      message1: "columns %1",
      args1: [{ type: "input_statement", name: "COLUMNS" }],
      message2: "rows %1",
      args2: [{ type: "input_statement", name: "ROWS" }],
      previousStatement: null,
      nextStatement: null,
      colour: "#0EA5E9",
    },
    {
      type: "lido_table_column",
      message0: "column key %1 label %2 type %3",
      args0: [
        { type: "field_input", name: "KEY", text: "field" },
        { type: "field_input", name: "LABEL", text: "Field" },
        { type: "field_input", name: "TYPE", text: "text" },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#0EA5E9",
    },
    {
      type: "lido_table_row",
      message0: "row json %1",
      args0: [{ type: "field_input", name: "ROW", text: "{\n  \"field\": \"Value\"\n}" }],
      previousStatement: null,
      nextStatement: null,
      colour: "#0EA5E9",
    },
  ]);
}

function parseCsv(input: string) {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildDefinition(Blockly: any, workspace: any) {
  const topBlocks = workspace.getTopBlocks(true) || [];
  const botBlock = topBlocks.find((b: any) => b.type === "lido_bot");
  if (!botBlock) return null;

  const name = botBlock.getFieldValue("NAME") || "Bot";
  const version = botBlock.getFieldValue("VERSION") || "1.0.0";
  const keywords: Record<string, string[]> = {};
  const intents: Record<string, any> = {};

  let keywordBlock = botBlock.getInputTargetBlock("KEYWORDS");
  while (keywordBlock) {
    if (keywordBlock.type === "lido_keyword") {
      const key = keywordBlock.getFieldValue("KEY") || "keyword";
      const phrases = parseCsv(keywordBlock.getFieldValue("PHRASES") || "");
      keywords[key] = phrases;
    }
    keywordBlock = keywordBlock.getNextBlock();
  }

  let intentBlock = botBlock.getInputTargetBlock("INTENTS");
  while (intentBlock) {
    if (intentBlock.type === "lido_intent") {
      const intentName = intentBlock.getFieldValue("INTENT") || "intent";
      const responseBlock = intentBlock.getInputTargetBlock("RESPONSE");
      const response = buildResponseFromBlock(Blockly, responseBlock, []);
      intents[intentName] = response;
    }
    intentBlock = intentBlock.getNextBlock();
  }

  return { name, version, keywords, intents };
}

function buildLayoutFromBlock(Blockly: any, block: any, diagnostics: BlocklyDiagnostic[]) {
  const layout: any[] = [];
  let current = block;
  while (current) {
    const jsLines = buildHelperJsBlock(Blockly, current, diagnostics);
    if (jsLines.length) helpers.push({ type: "js", code: jsLines.join("\\n") });
    if (current.type === "lido_app_component") {
      const type = current.getFieldValue("TYPE");
      const configRaw = current.getFieldValue("CONFIG") || "";
      let config: any = {};
      if (configRaw.trim()) {
        try {
          config = JSON.parse(configRaw);
        } catch {
          diagnostics.push({
            severity: "warning",
            message: "Component config JSON is invalid for " + type + ".",
            blockType: "lido_app_component",
          });
          config = {};
        }
      }
      if (!config || typeof config !== 'object' || Array.isArray(config)) {
        diagnostics.push({
          severity: "warning",
          message: "Component config must be a JSON object for " + type + ".",
          blockType: "lido_app_component",
        });
        config = {};
      }
      layout.push({ type, ...config });
    }
    current = current.getNextBlock();
  }
  return layout;
}

function buildHelperJsLines(Blockly: any, block: any, diagnostics: BlocklyDiagnostic[]) {
  const lines: string[] = [];
  let current = block;

  const parseConfig = (raw: string, blockType: string) => {
    if (!raw || !raw.trim()) return {};
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        diagnostics.push({
          severity: "warning",
          message: "Component config must be a JSON object.",
          blockType,
        });
        return {};
      }
      return parsed;
    } catch {
      diagnostics.push({
        severity: "warning",
        message: "Component config JSON is invalid.",
        blockType,
      });
      return {};
    }
  };

  while (current) {
    const type = current.type;
    if (type === "lido_helper_js") {
      const code = current.getFieldValue("CODE") || "";
      if (code.trim()) lines.push(code);
    }
    if (type === "lido_dyn_layout_init") {
      const target = current.getFieldValue("TARGET") || "layout";
      lines.push(`const ${target} = [];`);
      lines.push(`payload.layout = ${target};`);
    }
    if (type === "lido_dyn_set") {
      const name = current.getFieldValue("VAR") || "value";
      const expr = current.getFieldValue("EXPR") || "null";
      lines.push(`const ${name} = ${expr};`);
    }
    if (type === "lido_dyn_set_layout_expr") {
      const expr = current.getFieldValue("EXPR") || "[]";
      lines.push(`payload.layout = ${expr};`);
    }
    if (type === "lido_dyn_set_message_expr") {
      const expr = current.getFieldValue("EXPR") || "\"\"";
      lines.push(`payload.message = ${expr};`);
    }
    if (type === "lido_dyn_push_component") {
      const target = current.getFieldValue("TARGET") || "layout";
      const compType = current.getFieldValue("TYPE") || "text";
      const configRaw = current.getFieldValue("CONFIG") || "{}";
      const config = parseConfig(configRaw, "lido_dyn_push_component");
      const configStr = JSON.stringify(config);
      lines.push(`${target}.push(Object.assign({ type: ${JSON.stringify(compType)} }, ${configStr}));`);
    }
    if (type === "lido_dyn_push_component_expr") {
      const target = current.getFieldValue("TARGET") || "layout";
      const compType = current.getFieldValue("TYPE") || "text";
      const expr = current.getFieldValue("EXPR") || "{}";
      lines.push(`${target}.push(Object.assign({ type: ${JSON.stringify(compType)} }, ${expr}));`);
    }
    if (type === "lido_dyn_for_each") {
      const item = current.getFieldValue("ITEM") || "item";
      const list = current.getFieldValue("LIST") || "[]";
      const doBlock = current.getInputTargetBlock("DO");
      const bodyLines = buildHelperJsLines(Blockly, doBlock, diagnostics);
      lines.push(`for (const ${item} of ${list}) {`);
      bodyLines.forEach((line) => lines.push(`  ${line}`));
      lines.push("}");
    }
    current = current.getNextBlock();
  }

  return lines;
}

function buildHelperJsBlock(Blockly: any, block: any, diagnostics: BlocklyDiagnostic[]) {
  if (!block) return [];
  const type = block.type;
  if (type === "lido_helper_js") {
    const code = block.getFieldValue("CODE") || "";
    return code.trim() ? [code] : [];
  }
  if (type === "lido_dyn_layout_init") {
    const target = block.getFieldValue("TARGET") || "layout";
    return [`const ${target} = [];`, `payload.layout = ${target};`];
  }
  if (type === "lido_dyn_set") {
    const name = block.getFieldValue("VAR") || "value";
    const expr = block.getFieldValue("EXPR") || "null";
    return [`const ${name} = ${expr};`];
  }
  if (type === "lido_dyn_set_layout_expr") {
    const expr = block.getFieldValue("EXPR") || "[]";
    return [`payload.layout = ${expr};`];
  }
  if (type === "lido_dyn_set_message_expr") {
    const expr = block.getFieldValue("EXPR") || "\"\"";
    return [`payload.message = ${expr};`];
  }
  if (type === "lido_dyn_push_component" || type === "lido_dyn_push_component_expr") {
    const target = block.getFieldValue("TARGET") || "layout";
    const compType = block.getFieldValue("TYPE") || "text";
    const raw = type === "lido_dyn_push_component" ? block.getFieldValue("CONFIG") || "{}" : block.getFieldValue("EXPR") || "{}";
    if (type === "lido_dyn_push_component") {
      let config: any = {};
      if (raw.trim()) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            config = parsed;
          } else {
            diagnostics.push({
              severity: "warning",
              message: "Component config must be a JSON object.",
              blockType: "lido_dyn_push_component",
            });
          }
        } catch {
          diagnostics.push({
            severity: "warning",
            message: "Component config JSON is invalid.",
            blockType: "lido_dyn_push_component",
          });
        }
      }
      const configStr = JSON.stringify(config);
      return [`${target}.push(Object.assign({ type: ${JSON.stringify(compType)} }, ${configStr}));`];
    }
    return [`${target}.push(Object.assign({ type: ${JSON.stringify(compType)} }, ${raw}));`];
  }
  if (type === "lido_dyn_for_each") {
    const item = block.getFieldValue("ITEM") || "item";
    const list = block.getFieldValue("LIST") || "[]";
    const doBlock = block.getInputTargetBlock("DO");
    const bodyLines = buildHelperJsLines(Blockly, doBlock, diagnostics);
    return [
      `for (const ${item} of ${list}) {`,
      ...bodyLines.map((line) => `  ${line}`),
      "}",
    ];
  }
  return [];
}

function buildHelpersFromBlock(Blockly: any, block: any, diagnostics: BlocklyDiagnostic[]) {
  if (!block) return [];
  const helpers: any[] = [];
  let current = block;

  const parseJson = (raw: string, fallback: any, blockType: string, label: string) => {
    if (!raw || !raw.trim()) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      diagnostics.push({
        severity: "warning",
        message: `${label} JSON is invalid and was ignored.`,
        blockType,
      });
      return fallback;
    }
  };

  while (current) {
    const jsLines = buildHelperJsBlock(Blockly, current, diagnostics);
    if (jsLines.length) helpers.push({ type: "js", code: jsLines.join("\\n") });
    if (current.type === "lido_helper_fetch") {
      const url = current.getFieldValue("URL") || "";
      const method = current.getFieldValue("METHOD") || "GET";
      const name = current.getFieldValue("VAR") || "apiResult";
      const headers = parseJson(current.getFieldValue("HEADERS") || "{}", {}, "lido_helper_fetch", "Headers");
      const body = parseJson(current.getFieldValue("BODY") || "{}", null, "lido_helper_fetch", "Body");
      helpers.push({ type: "fetch", name, url, method, headers, body });
    }
    if (current.type === "lido_helper_db_select") {
      const table = current.getFieldValue("TABLE") || "";
      const columnsRaw = current.getFieldValue("COLUMNS") || "*";
      const columns = parseCsv(columnsRaw);
      if (columns.length === 0) columns.push("*");
      const name = current.getFieldValue("VAR") || "rows";
      const where = parseJson(current.getFieldValue("WHERE") || "{}", {}, "lido_helper_db_select", "Where");
      const options = parseJson(current.getFieldValue("OPTIONS") || "{}", {}, "lido_helper_db_select", "Options");
      helpers.push({ type: "db_select", name, table, columns, where, options });
    }
    if (current.type === "lido_helper_db_aggregate") {
      const table = current.getFieldValue("TABLE") || "";
      const name = current.getFieldValue("VAR") || "stats";
      const aggregations = parseJson(current.getFieldValue("AGG") || "{}", {}, "lido_helper_db_aggregate", "Aggregations");
      const where = parseJson(current.getFieldValue("WHERE") || "{}", {}, "lido_helper_db_aggregate", "Where");
      helpers.push({ type: "db_aggregate", name, table, aggregations, where });
    }
    current = current.getNextBlock();
  }

  return helpers;
}
function buildResponseFromBlock(Blockly: any, block: any, diagnostics: BlocklyDiagnostic[]) {
  if (!block) return null;
  if (block.type === "lido_app_response") {
    const message = block.getFieldValue("MESSAGE") || "";
    const layoutBlock = block.getInputTargetBlock("LAYOUT");
    if (!layoutBlock) {
      diagnostics.push({
        severity: "warning",
        message: "Application response has no layout blocks. Add App Component blocks to the layout input.",
        blockType: "lido_app_response",
      });
    }
    const layout = buildLayoutFromBlock(Blockly, layoutBlock, diagnostics);
    const helperBlock = block.getInputTargetBlock("HELPERS");
    const helpers = buildHelpersFromBlock(Blockly, helperBlock, diagnostics);
    const payload: any = {};
    if (message) payload.message = message;
    if (layout.length) payload.layout = layout;
    if (!layout.length) {
      diagnostics.push({
        severity: "warning",
        message: "Application layout is empty. Add at least one App Component block.",
        blockType: "lido_app_response",
      });
    }
    if (helpers.length) payload.__helpers = helpers;
    return payload;
  }
  if (block.type !== "lido_response") return null;

  const message = block.getFieldValue("MESSAGE") || "";
  const suggestions = parseCsv(block.getFieldValue("SUGGESTIONS") || "");
  const actionsCsv = parseCsv(block.getFieldValue("ACTIONS") || "");
  const actions = actionsCsv.map((label) => ({ type: "button", label, value: label.toLowerCase().replace(/\s+/g, "_") }));
  const metadataRaw = block.getFieldValue("METADATA") || "";
  let metadata: any = null;
  if (metadataRaw.trim()) {
    try {
      metadata = JSON.parse(metadataRaw);
    } catch {
      diagnostics.push({
        severity: "warning",
        message: "Metadata JSON is invalid and was ignored.",
        blockType: "lido_response",
      });
      metadata = null;
    }
  }

  const formBlock = block.getInputTargetBlock("FORM");
  const tableBlock = block.getInputTargetBlock("TABLE");

  const helperBlock = block.getInputTargetBlock("HELPERS");

  const form = buildFormFromBlock(Blockly, formBlock, diagnostics);
  const table = buildTableFromBlock(Blockly, tableBlock, diagnostics);
  const helpers = buildHelpersFromBlock(Blockly, helperBlock, diagnostics);

  const payload: any = { message };
  if (suggestions.length) payload.suggestions = suggestions;
  if (actions.length) payload.actions = actions;
  if (metadata) payload.metadata = metadata;
  if (form) payload.form = form;
  if (table) payload.table = table;
  if (helpers.length) payload.__helpers = helpers;

  return payload;
}

function buildFormFromBlock(Blockly: any, block: any, diagnostics: BlocklyDiagnostic[]) {
  if (!block || block.type !== "lido_form") return null;

  const title = block.getFieldValue("TITLE") || "Form";
  const submitLabel = block.getFieldValue("SUBMIT") || "Submit";
  const cancelLabel = block.getFieldValue("CANCEL") || "Cancel";
  const fields: any[] = [];

  let fieldBlock = block.getInputTargetBlock("FIELDS");
  while (fieldBlock) {
    if (fieldBlock.type === "lido_form_field") {
      const type = fieldBlock.getFieldValue("TYPE");
      const name = fieldBlock.getFieldValue("NAME");
      const label = fieldBlock.getFieldValue("LABEL");
      const required = fieldBlock.getFieldValue("REQUIRED") === "TRUE";
      const options = parseCsv(fieldBlock.getFieldValue("OPTIONS") || "");
      if (type === "select" && options.length === 0) {
        diagnostics.push({
          severity: "warning",
          message: `Select field "${name}" has no options.`,
          blockType: "lido_form_field",
        });
      }
      fields.push({ type, name, label, required, options });
    }
    fieldBlock = fieldBlock.getNextBlock();
  }

  return { title, submitLabel, cancelLabel, fields };
}

function buildTableFromBlock(Blockly: any, block: any, diagnostics: BlocklyDiagnostic[]) {
  if (!block || block.type !== "lido_table") return null;

  const title = block.getFieldValue("TITLE") || "Table";
  const columns: any[] = [];
  const rows: any[] = [];

  let columnBlock = block.getInputTargetBlock("COLUMNS");
  while (columnBlock) {
    if (columnBlock.type === "lido_table_column") {
      columns.push({
        key: columnBlock.getFieldValue("KEY"),
        label: columnBlock.getFieldValue("LABEL"),
        type: columnBlock.getFieldValue("TYPE"),
      });
    }
    columnBlock = columnBlock.getNextBlock();
  }

  let rowBlock = block.getInputTargetBlock("ROWS");
  while (rowBlock) {
    if (rowBlock.type === "lido_table_row") {
      try {
        const row = JSON.parse(rowBlock.getFieldValue("ROW") || "{}");
        rows.push(row);
      } catch {
        diagnostics.push({
          severity: "warning",
          message: "Table row JSON is invalid and was replaced with an empty row.",
          blockType: "lido_table_row",
        });
        rows.push({});
      }
    }
    rowBlock = rowBlock.getNextBlock();
  }

  return { title, columns, rows };
}

function buildJsFromDefinition(definition: any) {
  if (!definition) return "";
  const intents = definition.intents || {};
  const sanitizeVar = (raw: string) => {
    const base = (raw || "result").replace(/[^A-Za-z0-9_]/g, "_");
    if (!base) return "result";
    return /^[A-Za-z_]/.test(base) ? base : `_${base}`;
  };
  const buildHelperLines = (helpersList: any[]) => {
    const lines: string[] = [];
    if (!helpersList || helpersList.length === 0) return lines;
    const hasJs = helpersList.some((h) => h?.type === "js");
    if (hasJs) {
      lines.push("      const { db, form, table, utils, suggestions } = helpers;");
    }
    lines.push("      payload.metadata = payload.metadata || {};");
    helpersList.forEach((helper) => {
      const varName = sanitizeVar(helper?.name);
      const metaKey = JSON.stringify(helper?.name || varName);
      if (helper?.type === "fetch") {
        const url = JSON.stringify(helper.url || "");
        const method = helper.method && helper.method !== "GET" ? `method: ${JSON.stringify(helper.method)}` : null;
        const headers = helper.headers && Object.keys(helper.headers).length ? `headers: ${JSON.stringify(helper.headers)}` : null;
        const body = helper.body ? `body: ${JSON.stringify(typeof helper.body === "string" ? helper.body : JSON.stringify(helper.body))}` : null;
        const initParts = [method, headers, body].filter(Boolean);
        const init = initParts.length ? `{ ${initParts.join(", ")} }` : "undefined";
        lines.push(`      const ${varName} = await fetch(${url}, ${init}).then((res) => res.json()).catch(() => null);`);
        lines.push(`      payload.metadata[${metaKey}] = ${varName};`);
      }
      if (helper?.type === "db_select") {
        const table = JSON.stringify(helper.table || "");
        const columns = JSON.stringify(helper.columns || ["*"]);
        const where = JSON.stringify(helper.where || {});
        const options = JSON.stringify(helper.options || {});
        lines.push(`      const ${varName} = await helpers.db.select(${table}, ${columns}, ${where}, ${options});`);
        lines.push(`      payload.metadata[${metaKey}] = ${varName};`);
      }
      if (helper?.type === "db_aggregate") {
        const table = JSON.stringify(helper.table || "");
        const aggregations = JSON.stringify(helper.aggregations || {});
        const where = JSON.stringify(helper.where || {});
        lines.push(`      const ${varName} = await helpers.db.aggregate(${table}, ${aggregations}, ${where});`);
        lines.push(`      payload.metadata[${metaKey}] = ${varName};`);
      }
      if (helper?.type === "js") {
        const code = helper.code || "";
        if (code) {
          code.split("\\n").forEach((line) => {
            lines.push(`      ${line}`);
          });
        }
      }
    });
    return lines;
  };
  const intentEntries = Object.keys(intents).map((name) => {
    const payload = intents[name] || {};
    const helpersList = Array.isArray(payload.__helpers) ? payload.__helpers : [];
    const payloadCopy = { ...payload };
    delete payloadCopy.__helpers;
    const payloadString = JSON.stringify(payloadCopy, null, 2);
    if (!helpersList.length) {
      return `    ${JSON.stringify(name)}: async (context, helpers) => (${payloadString}),`;
    }
    const helperLines = buildHelperLines(helpersList);
    return `    ${JSON.stringify(name)}: async (context, helpers) => {\n      const payload = ${payloadString};\n${helperLines.join("\\n")}\n      return payload;\n    },`;
  });

  return `module.exports = {\n  name: ${JSON.stringify(definition.name)},\n  version: ${JSON.stringify(definition.version)},\n  keywords: ${JSON.stringify(definition.keywords || {}, null, 2)},\n  intents: {\n${intentEntries.join("\\n")}\n  },\n};`;
}

function buildWorkspaceState(Blockly: any, workspace: any) {
  const diagnostics: BlocklyDiagnostic[] = [];
  const topBlocks = workspace.getTopBlocks(true) || [];
  const botBlock = topBlocks.find((b: any) => b.type === "lido_bot");

  if (!botBlock) {
    diagnostics.push({ severity: "error", message: "Add a Bot block to start building.", blockType: "lido_bot" });
    return { definition: null, diagnostics };
  }

  const name = botBlock.getFieldValue("NAME") || "Bot";
  const version = botBlock.getFieldValue("VERSION") || "1.0.0";
  const keywords: Record<string, string[]> = {};
  const intents: Record<string, any> = {};

  let keywordBlock = botBlock.getInputTargetBlock("KEYWORDS");
  while (keywordBlock) {
    if (keywordBlock.type === "lido_keyword") {
      const key = keywordBlock.getFieldValue("KEY") || "keyword";
      const phrases = parseCsv(keywordBlock.getFieldValue("PHRASES") || "");
      keywords[key] = phrases;
      if (phrases.length === 0) {
        diagnostics.push({
          severity: "warning",
          message: `Keyword "${key}" has no phrases.`,
          blockType: "lido_keyword",
        });
      }
    }
    keywordBlock = keywordBlock.getNextBlock();
  }

  let intentBlock = botBlock.getInputTargetBlock("INTENTS");
  let intentCount = 0;
  while (intentBlock) {
    if (intentBlock.type === "lido_intent") {
      intentCount += 1;
      const intentName = intentBlock.getFieldValue("INTENT") || "intent";
      const responseBlock = intentBlock.getInputTargetBlock("RESPONSE");
      if (!responseBlock) {
        diagnostics.push({
          severity: "warning",
          message: `Intent "${intentName}" has no response block.`,
          blockType: "lido_intent",
        });
      }
      const response = buildResponseFromBlock(Blockly, responseBlock, diagnostics);
      intents[intentName] = response;
    }
    intentBlock = intentBlock.getNextBlock();
  }

  if (intentCount == 0) {
    diagnostics.push({
      severity: "warning",
      message: "No intents defined. Add at least one intent block.",
      blockType: "lido_intent",
    });
  }

  return { definition: { name, version, keywords, intents }, diagnostics };
}
export default function BlocklyEditor({ initialXml, onXmlChange, onCodeChange, onPreviewChange, onDiagnosticsChange }: BlocklyEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<any>(null);
  const initialXmlRef = useRef(initialXml);
  const blocklyRef = useRef<any>(null);
  const lastXmlRef = useRef<string | undefined>(initialXml);
  const lastEmittedXmlRef = useRef<string | undefined>(initialXml);
  const onXmlChangeRef = useRef(onXmlChange);
  const onCodeChangeRef = useRef(onCodeChange);
  const onPreviewChangeRef = useRef(onPreviewChange);
  const onDiagnosticsChangeRef = useRef<BlocklyEditorProps["onDiagnosticsChange"]>(undefined);

  useEffect(() => {
    onXmlChangeRef.current = onXmlChange;
    onCodeChangeRef.current = onCodeChange;
    onPreviewChangeRef.current = onPreviewChange;
    onDiagnosticsChangeRef.current = onDiagnosticsChange;
  }, [onXmlChange, onCodeChange, onPreviewChange, onDiagnosticsChange]);

  useEffect(() => {
    let active = true;

    const init = async () => {
      const Blockly = await import("blockly");
      if (!active || !containerRef.current) return;

      defineBlocks(Blockly);

      blocklyRef.current = Blockly;

      const workspace = Blockly.inject(containerRef.current, {
        toolbox: BOT_TOOLBOX,
        grid: { spacing: 20, length: 3, colour: "#E5E7EB", snap: true },
        zoom: { controls: true, wheel: true },
        renderer: "thrasos",
      });

      workspaceRef.current = workspace;

      if (initialXmlRef.current) {
        try {
          const dom = Blockly.Xml.textToDom(initialXmlRef.current);
          Blockly.Xml.domToWorkspace(dom, workspace);
        } catch {
          // ignore malformed XML
        }
      }

      const emit = () => {
        const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace));
        lastEmittedXmlRef.current = xml;
        onXmlChangeRef.current?.(xml);
        const { definition, diagnostics } = buildWorkspaceState(Blockly, workspace);
        onDiagnosticsChangeRef.current?.(diagnostics);
        if (definition) {
          const js = buildJsFromDefinition(definition);
          onCodeChangeRef.current?.(js);
          onPreviewChangeRef.current?.(definition);
        } else {
          onCodeChangeRef.current?.("");
          onPreviewChangeRef.current?.(null);
        }
      };

      workspace.addChangeListener(() => emit());
      emit();
    };

    init();

    return () => {
      active = false;
      if (workspaceRef.current) {
        workspaceRef.current.dispose();
        workspaceRef.current = null;
      }
    };
  }, []);
  useEffect(() => {
    if (!workspaceRef.current || !blocklyRef.current) return;
    if (initialXml === lastXmlRef.current) return;
    if (initialXml === lastEmittedXmlRef.current) return;
    lastXmlRef.current = initialXml;
    if (!initialXml) return;
    try {
      const Blockly = blocklyRef.current;
      workspaceRef.current.clear();
      const dom = Blockly.Xml.textToDom(initialXml);
      Blockly.Xml.domToWorkspace(dom, workspaceRef.current);
    } catch {
      // ignore malformed XML
    }
  }, [initialXml]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", minHeight: 520, borderRadius: 12, overflow: "hidden" }}
    />
  );
}











