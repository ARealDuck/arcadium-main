import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, Button } from "@headlessui/react";
import { QueueIcon } from "../Home/QueueCard";
import ProgressBar from "../General/ProgressBar";
import { toFixedTruncated } from "../../util/helpers";
import { useEffect, useMemo, useState } from "react";
import { buildSteps } from "../../util/rank";
import { useRank, useTiers } from "../../hooks/useTiers";
import ArcButton from "../General/ArcButton";

type MatchResultDialogProps = {
  open: boolean;
  win: boolean;
  onClose: (queue: boolean) => void;
  ratingChange?: number;
  rating_before: number;
  rating_after: number;
  placement?: { played: number; required: number }
};

export function MatchResultsDialog({ open, win, onClose, ratingChange, rating_before, rating_after, placement }: MatchResultDialogProps) {

  const inPlacements = !!placement && placement.played < placement.required

  const [placementValue, setPlacementValue] = useState(0);
  const [placementAnimate, setPlacementAnimate] = useState(false);

  const { tiers } = useTiers();

  const steps = useMemo(
    () => (tiers ? buildSteps(rating_before, rating_after, tiers) : []),
    [rating_before, rating_after, tiers]
  );

  const [i, setI] = useState(0);
  const [currProgress, setCurrProgress] = useState(steps[0].from)
  const [animate, setAnimate] = useState(false);

  const step = steps[i];
  const stepRank = useRank(step?.rating ?? null);

  console.log("render", placement?.played, placementValue, placementAnimate);

  useEffect(() => {
    if (!open || !placement) return;

    console.log("effect ran", open, placement?.played);

    setPlacementAnimate(false);
    setPlacementValue(((placement.played - 1) / placement.required) * 100)

    const id = setTimeout(() => {
      setPlacementAnimate(true);
      setPlacementValue(((placement.played) / placement.required * 100));
    }, 50)
    return () => clearTimeout(id)
  }, [open, placement?.played, placement?.required])

  useEffect(() => {
    if (!open) return

    setAnimate(false);
    setCurrProgress(steps[i].from);

    const id = setTimeout(() => {
      setAnimate(true)
      setCurrProgress(steps[i].to)
    }, 50)
    return () => clearTimeout(id);
  }, [i, open])

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/60 transition duration-200 data-closed:opacity-0"
      />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className="w-full max-w-2xl rounded-lg bg-foreground p-8 text-center
                     transition duration-200 ease-out data-closed:opacity-0 data-closed:scale-95"
        >
          <p className="text-left font-archivo tracking-[0.2em] text-subtext text-xl">MATCH RESULTS</p>
          

          <DialogTitle className="mt-4 font-archivo text-3xl uppercase tracking-widest">
            {
              win ? (<span className="text-green-800">CLEAR</span>) : <span className="text-red-800">FAIL</span>
            }
          </DialogTitle>


          {inPlacements ? (
            <div className="w-3/4 mx-auto mt-6">
              <p className="font-archivo tracking-[0.2em text-subtext mb-3">
                PLACEMENTS {placement!.played} / {placement!.required}
              </p>
              <ProgressBar 
              value={placementValue}
              animate={placementAnimate}
              durationMs={2000}
              className="bg-highlight"
              />
              <p className="font-sanchez text-subtext mt-2 text-sm">
                {placement!.required - placement!.played} more{" "}
                {placement!.required - placement!.played === 1 ? "game" : "games"} until you're ranked
              </p>
            </div>
          ) : (
            <>
              <QueueIcon
                rating={step.rating}
                displayRating={true}
                displayProgress={false}
              />

              <div className="w-3/4 mx-auto mt-5">
                <ProgressBar
                durationMs={Math.abs(steps[i].to - steps[i].from) * 100}
                value={currProgress}
                animate={animate}
                onTransitionEnd={() => {
                  if (i < steps.length - 1) setI(i + 1);
                }}
                />
                {
                  stepRank?.ranked && stepRank.progress && (
                    <div className="font-sanchez flex flex-row justify-between text-subtext mt-2 text-sm">
                      <p>{stepRank.progress.start}</p>
                        {stepRank.next && <p>{stepRank.next.label} &middot; {stepRank.next.at}</p>}
                    </div> 
                  )
                }

              </div>

              <p className="font-archivo text-2xl mt-5">
                <span className={`${rating_after >= rating_before ? "text=green-800" : "text-red-800"} bg-background px-4 py-2 rounded-md`}>{rating_after > rating_before ? "+" : ""}{toFixedTruncated((rating_after - rating_before), 0)}</span>
              </p>     
            </>
          )}

          <div className="flex flex-col lg:flex-row gap-1 lg:gap-20 w-5/6 mx-auto lg:w-full">
            <Button onClick={() => onClose(false)} className="font-sanchez w-full h-10  mt-6 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 duration-200 cursor-pointer rounded-sm font-semibold">Close</Button>
            <ArcButton
              onClick={() => onClose(true)}
              className="mt-6 w-full h-10 rounded-md bg-highlight font-semibold
                        data-hover:brightness-110 transition cursor-pointer"
            >
              Queue Again
            </ArcButton>
          </div>

        </DialogPanel>
      </div>
    </Dialog>
  );
}