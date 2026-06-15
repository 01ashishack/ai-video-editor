import type { Project } from "../../project/index.js";
import type { CommandHandler } from "../command-types.js";

export interface ClipTrimCommandPayload {
  clipId: string;
  duration: number;
}

export const clipTrimCommandHandler: CommandHandler<
  ClipTrimCommandPayload
> = (context) => {
  const { clipId, duration } = context.command.payload;
  const projectHashBefore = context.project.metadata.contentHash;
  const clipExists = context.project.timeline.tracks.some((track) =>
    track.clips.some((clip) => clip.id === clipId)
  );

  if (!clipExists) {
    return {
      project: context.project as Project,
      result: {
        commandId: context.command.commandId,
        status: "rejected",
        projectId: context.command.projectId,
        summary: `Clip not found: ${clipId}.`,
        diff: {
          added: [],
          updated: [],
          removed: []
        },
        warnings: [],
        errors: [
          {
            code: "CLIP_NOT_FOUND",
            message: `Clip not found: ${clipId}.`
          }
        ],
        projectHashBefore
      }
    };
  }

  if (duration <= 0) {
    return {
      project: context.project as Project,
      result: {
        commandId: context.command.commandId,
        status: "rejected",
        projectId: context.command.projectId,
        summary: "Clip duration must be greater than zero.",
        diff: {
          added: [],
          updated: [],
          removed: []
        },
        warnings: [],
        errors: [
          {
            code: "INVALID_CLIP_DURATION",
            message: "Clip duration must be greater than zero."
          }
        ],
        projectHashBefore
      }
    };
  }

  const nextProject: Project = {
    ...context.project,
    timeline: {
      ...context.project.timeline,
      tracks: context.project.timeline.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) =>
          clip.id === clipId
            ? {
                ...clip,
                timelineRange: {
                  ...clip.timelineRange,
                  duration
                }
              }
            : clip
        )
      }))
    }
  };

  return {
    project: context.dryRun ? (context.project as Project) : nextProject,
    result: {
      commandId: context.command.commandId,
      status: context.dryRun ? "dry-run" : "applied",
      projectId: context.command.projectId,
      summary: `Trimmed clip ${clipId}.`,
      diff: {
        added: [],
        updated: [
          {
            path: `/timeline/clips/${clipId}`,
            entityType: "TimelineClip",
            entityId: clipId
          }
        ],
        removed: []
      },
      warnings: [],
      errors: [],
      projectHashBefore,
      projectHashAfter: context.dryRun
        ? undefined
        : nextProject.metadata.contentHash
    }
  };
};
