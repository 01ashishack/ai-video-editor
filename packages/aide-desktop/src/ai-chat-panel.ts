import { type Project } from "@aide/core";
import {
  editProject,
  type EditingIntent
} from "@aide/ai-command-interpreter";

export interface AIChatConversationEntry {
  request: string;
  intents: EditingIntent[];
  confidence: number;
  requiresClarification: boolean;
  ambiguityReasons: readonly string[];
  dryRunSummary: readonly string[];
}

export interface AIChatPanelState {
  history: readonly AIChatConversationEntry[];
  applyStatus?: AIChatApplyStatus;
}

export interface AIChatApplyStatus {
  kind: "success" | "failure";
  message: string;
}

export async function submitAIChatRequest(
  project: Project,
  request: string,
  state: AIChatPanelState = createAIChatPanelState()
): Promise<AIChatPanelState> {
  validateRequest(request);

  const result = await editProject({
    project: structuredClone(project),
    request
  });
  const entry = freezeConversationEntry({
    request: request.trim(),
    intents: structuredClone(result.intents),
    confidence: result.confidence,
    requiresClarification: result.requiresClarification,
    ambiguityReasons: [...result.ambiguityReasons],
    dryRunSummary: [...result.dryRun.summary]
  });

  return Object.freeze({
    history: Object.freeze([...state.history, entry]),
    applyStatus: state.applyStatus
  });
}

export function createAIChatPanelState(
  history: readonly AIChatConversationEntry[] = [],
  applyStatus?: AIChatApplyStatus
): AIChatPanelState {
  return Object.freeze({
    history: Object.freeze(history.map(freezeConversationEntry)),
    applyStatus: applyStatus
      ? Object.freeze({
          kind: applyStatus.kind,
          message: applyStatus.message
        })
      : undefined
  });
}

export function withAIChatApplyStatus(
  state: AIChatPanelState,
  applyStatus: AIChatApplyStatus
): AIChatPanelState {
  return createAIChatPanelState(state.history, applyStatus);
}

export function createAIChatPanel(
  state: AIChatPanelState = createAIChatPanelState()
): string {
  return `<section class="panel ai-chat-panel" aria-label="AI chat">
        <h2>AI Chat</h2>
        <form class="ai-chat-form" data-ai-chat-form>
          <label for="ai-chat-request">Editing request</label>
          <div class="ai-chat-controls">
            <input id="ai-chat-request" name="request" type="text" autocomplete="off" />
            <button type="submit">Submit</button>
          </div>
        </form>
        ${renderApplyStatus(state.applyStatus)}
        <div class="conversation-history" aria-label="Conversation history">
          ${renderConversationHistory(state.history)}
        </div>
      </section>`;
}

export function renderConversationHistory(
  history: readonly AIChatConversationEntry[]
): string {
  if (history.length === 0) {
    return '<p class="muted">No requests submitted</p>';
  }

  return history.map(renderConversationEntry).join("\n          ");
}

function renderConversationEntry(
  entry: AIChatConversationEntry,
  index: number
): string {
  return `<article class="conversation-entry" data-conversation-index="${index}">
            <p class="conversation-request"><strong>Request:</strong> ${escapeHtml(entry.request)}</p>
            <h3>Generated Intents</h3>
            ${renderIntents(entry.intents)}
            <dl class="ai-result-metadata">
              <dt>Confidence</dt><dd>${entry.confidence}</dd>
              <dt>Requires Clarification</dt><dd>${entry.requiresClarification}</dd>
            </dl>
            <h3>Clarification</h3>
            ${renderList(entry.ambiguityReasons, "No clarification required")}
            <h3>Dry Run Summary</h3>
            ${renderList(entry.dryRunSummary, "No planned changes")}
            <button class="apply-edit-button" type="button" data-apply-request="${escapeHtml(entry.request)}">Apply Changes</button>
          </article>`;
}

function renderApplyStatus(status: AIChatApplyStatus | undefined): string {
  if (!status) {
    return "";
  }

  return `<p class="apply-status apply-status-${status.kind}" role="status">${escapeHtml(status.message)}</p>`;
}

function renderIntents(intents: readonly EditingIntent[]): string {
  if (intents.length === 0) {
    return '<p class="muted">No intents generated</p>';
  }

  return `<pre class="intent-output">${escapeHtml(
    JSON.stringify(intents, null, 2)
  )}</pre>`;
}

function renderList(items: readonly string[], emptyMessage: string): string {
  if (items.length === 0) {
    return `<p class="muted">${emptyMessage}</p>`;
  }

  return `<ul>
              ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n              ")}
            </ul>`;
}

function freezeConversationEntry(
  entry: AIChatConversationEntry
): AIChatConversationEntry {
  return Object.freeze({
    request: entry.request,
    intents: Object.freeze(structuredClone(entry.intents)) as EditingIntent[],
    confidence: entry.confidence,
    requiresClarification: entry.requiresClarification,
    ambiguityReasons: Object.freeze([...entry.ambiguityReasons]),
    dryRunSummary: Object.freeze([...entry.dryRunSummary])
  });
}

function validateRequest(request: string): void {
  if (typeof request !== "string" || request.trim().length === 0) {
    throw new Error("AI chat request must be a non-empty string.");
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
