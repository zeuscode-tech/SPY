export type GamePhase =
  | "setup"
  | "categories"
  | "reveal"
  | "starter"
  | "playing"
  | "settings"
  | "results";

export type AndroidBackAction = "exit" | "hide-role" | "setup";

export function getAndroidBackAction(
  phase: GamePhase,
  isRoleVisible: boolean,
): AndroidBackAction {
  if (phase === "setup") return "exit";
  if (phase === "reveal" && isRoleVisible) return "hide-role";
  return "setup";
}
