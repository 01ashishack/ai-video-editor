import type { TimelineClip } from "../../models/index.js";
import type { Project } from "../../project/index.js";
import type { CommandHandler } from "../command-types.js";

export interface ClipSplitCommandPayload {
  clipId: string;
  splitAt: number;
}

export const clipSplitCommandHandler: CommandHandler<
  ClipSplitCommandPayload
> = (context) => {
  const { clipId, splitAt } = context.command.payload;
  const projectHashBefore = context.project.metadata.contentHash;
  const clipToSplit = context.project.timeline.tracks
    .flatMap((track) => track.clips)
    .find((clip) => clip.id === clipId);

  if (!clipToSplit) {
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

  if (splitAt <= 0 || splitAt >= clipToSplit.timelineRange.duration) {
    return {
      project: context.project as Project,
      result: {
        commandId: context.command.commandId,
        status: "rejected",
        projectId: context.command.projectId,
        summary: "Split position must be inside the clip duration.",
        diff: {
          added: [],
          updated: [],
          removed: []
        },
        warnings: [],
        errors: [
          {
            code: "INVALID_SPLIT_POSITION",
            message: "Split position must be inside the clip duration."
          }
        ],
        projectHashBefore
      }
    };
  }

  const part2Id = `${clipId}_part2`;
  const nextProject: Project = {
    ...context.project,
    timeline: {
      ...context.project.timeline,
      tracks: context.project.timeline.tracks.map((track) => ({
        ...track,
        clips: track.clips.flatMap((clip): TimelineClip[] => {
          if (clip.id !== clipId) {
            return [clip];
          }

          return [
            {
              ...clip,
              timelineRange: {
                ...clip.timelineRange,
                duration: splitAt
              }
            },
            {
              ...clip,
              id: part2Id,
              timelineRange: {
                ...clip.timelineRange,
                start: clip.timelineRange.start + splitAt,
                duration: clip.timelineRange.duration - splitAt
              }
            }
          ];
        })
      }))
    }
  };

  return {
    project: context.dryRun ? (context.project as Project) : nextProject,
    result: {
      commandId: context.command.commandId,
      status: context.dryRun ? "dry-run" : "applied",
      projectId: context.command.projectId,
      summary: `Split clip ${clipId}.`,
      diff: {
        added: [
          {
            path: `/timeline/clips/${part2Id}`,
            entityType: "TimelineClip",
            entityId: part2Id
          }
        ],
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
