"use client";

/**
 * Map geometry from the Simplemaps.com Africa SVG (src/assets/africa.svg).
 * Copyright (c) 2015 Pareto Software, LLC DBA Simplemaps.com
 * Offered under the MIT License — http://opensource.org/licenses/MIT
 * Attribution is appreciated! http://simplemaps.com
 */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import {
  participants as defaultParticipants,
  type Participant,
} from "@/data/participants";
import { textileProfiles, type TextileProfile } from "@/data/textileProfiles";
import TextileMotifBorder from "@/components/TextileMotifBorder";

type Country = { code: string; name: string; d: string };

/**
 * The 50 mainland/Madagascar country paths from the source SVG,
 * alphabetical by ISO code (this is also the entry-stagger order).
 */
const COUNTRIES: Country[] = [
  { code: "AO", name: "Angola", d: "m 495.3,598.6 -36,-0.2 -4.3,1.7 -3.5,-0.3 -5.1,1.9 -1.1,2.7 6,8.7 2.4,9.3 3.6,13.4 -3.8,5.5 -0.6,2.8 2.9,8.3 3.1,8.4 3.6,5 0.6,7.8 -1.4,10.3 -4,6.1 -7.1,9.1 -2.9,5.6 -4.1,12.5 -0.8,5.9 -4.3,12.7 -1.9,12.2 1,8.7 5.9,-2.7 7.2,-2.3 7.8,0.4 7.1,6.3 1.9,-1 48.8,-0.6 8.2,6.6 29.1,2 22.4,-5.7 -7.6,-8.6 -7.8,-11.3 1.6,-44 25.3,0.1 -1,-4.7 2,-5.2 -2,-6.5 1.5,-6.7 -1.2,-4.3 -5.5,-0.8 -7.6,2 -5.3,-0.3 -3,1.3 0.9,-16.5 -3.9,-5.1 -0.8,-8.5 1.9,-8.4 -2.4,-5.3 -0.1,-8.7 -14.8,0.1 1.1,-5 -6.2,0.1 -0.7,2.4 -7.6,0.5 -3.1,8.1 -1.9,3.4 -6.7,-1.9 -4,1.9 -8.1,1.1 -4.6,-7.2 -2.7,-4.5 -3.5,-8.3 -2.9,-10.3 z m -47.4,-2.7 0.4,-6 2,-3.5 4.5,-2.9 -4.6,-4.8 -3.7,2.3 -5,6 3.3,10.4 3.1,-1.5 z" },
  { code: "BF", name: "Burkina Faso", d: "m 300.7,310.8 -7.8,0 -3,-2.6 -6.7,1.9 -11.3,5.8 -2.3,4.3 -9.4,6.2 -1.7,3.6 -5.1,2.8 -5.8,-1.9 -3.4,3.4 -1.8,9.5 -9.7,11.4 0.3,4.7 -3.4,5.9 0.8,8 5.5,3 2.1,4.6 5.4,2.9 4.3,-3.4 5.7,-0.6 8.3,3.6 -1.6,-10.4 0.3,-7.9 21.1,-0.6 5.4,1 3.9,-2.2 5.6,1.1 10.7,0.3 4.1,-1.6 2.5,-6.1 6,-1.2 2.6,-4.2 0.3,-9.5 -14,-3.1 -0.4,-6.7 -6.9,-9 -1.6,-6.3 1,-6.7 z" },
  { code: "BI", name: "Burundi", d: "m 669,556.1 -0.6,-5.4 0,0 -6.5,-0.9 -3.8,7.9 -7.4,-1.1 3,6.3 0.1,2.4 4.3,13.2 0,0.6 1.2,-0.2 4.5,-5 4.9,-7.2 3,-2.9 -0.1,-4.5 -2.6,-3.2 z" },
  { code: "BJ", name: "Benin", d: "m 340,356 -9.3,-8 -4.3,0.1 -4.1,4 -2.6,4.2 -6,1.2 -2.5,6.1 -4.1,1.6 -1.6,7.2 3.7,4.1 4.3,4.9 0.4,6.8 2.5,2.8 -0.5,31.8 3,9.5 10.1,-1.6 0.6,-22.3 -0.3,-8.8 2.3,-8.7 3.7,-4.3 5.9,-8.5 -1.3,-3.7 2.4,-5.6 -2.8,-8.2 0.5,-4.6 z" },
  { code: "BW", name: "Botswana", d: "m 600.6,762.7 -2.2,-1 -6.9,3.1 -3.6,0 -7.9,5.4 -4.4,-5.7 -18.7,4.9 -9,0.4 -1.9,49.3 -11.8,0.5 -1.4,40.4 3.2,2 6.5,13.2 -1.5,8.4 2.5,4.9 8.5,-1.4 6.2,-6.2 5.8,-4.2 3.2,-6.6 6,-3.2 4.9,1.7 5.5,3.9 9.6,0.6 7.8,-3.2 1.4,-4.3 2.4,-6.6 6.5,-1.1 3.9,-5.2 4.4,-9.3 11.2,-10.3 17.3,-10.2 -7.3,-6.2 -9.2,-2.1 -3.1,-8.8 0.2,-4.9 -5.1,-1.5 -13,-15.2 -3.5,-8 -2.3,-2.4 -4.2,-11.1 z" },
  { code: "CD", name: "Dem. Rep. Congo", d: "m 618.3,446 -9.2,-1.4 -4.5,1.2 -1.8,3.3 -3.9,0.5 -4.9,-3 -13.5,6.9 -5.6,-1.4 -1.6,1.1 -3.6,8.4 -9.1,-2.7 -9,-1.4 -7.8,-5.1 -10.1,-4.7 -6.5,4.4 -4.7,7.1 -1,9.6 -0.7,8.4 -3.6,7.4 -2.4,8.6 -1.5,12.3 0.7,7.8 -2,4.8 -0.3,5.1 -1.4,4.4 -8.1,6.7 -5.6,7.1 -5.3,13.4 0.3,11.4 -3.1,4.4 -7.2,6.8 -7.2,8.7 -4.5,-2.5 -0.8,-3.9 -6.6,-0.1 -4.2,5.3 -3.2,-1.4 -4.5,2.9 -2,3.5 -0.4,6 -3.1,1.5 1.6,4.3 5.1,-1.9 3.5,0.3 4.3,-1.7 36,0.2 2.9,10.3 3.5,8.3 2.7,4.5 4.6,7.2 8.1,-1.1 4,-1.9 6.7,1.9 1.9,-3.4 3.1,-8.1 7.6,-0.5 0.7,-2.4 6.2,-0.1 -1.1,5 14.8,-0.1 0.1,8.7 2.4,5.3 -1.9,8.4 0.8,8.5 3.9,5.1 -0.9,16.5 3,-1.3 5.3,0.3 7.6,-2 5.5,0.8 4.2,0.3 0.6,4.3 5.7,-0.3 7.7,1.3 3.9,6.2 9.7,2 7.5,-4.4 2.6,7.3 9.2,1.9 4.3,5.9 4.8,7.6 9.3,0.1 -0.6,-14.9 -3.4,2.5 -8.4,-5.4 -3.2,-2.4 1.9,-13.9 2.5,-16.4 -2.6,-6.1 3.6,-8.8 3.3,-1.7 16.4,-2.3 2.1,0.6 0.6,-2.3 -3.4,-3.7 -1.5,-7.6 -7.3,-7.6 -4.1,-9.9 2.3,-5.8 -3.2,-7.8 2.4,-22.1 0.1,0.2 -0.1,-2.4 -3,-6.3 1.2,-7.6 1.7,-1 0.5,-8.3 3.5,-3.8 0.1,-10.5 2.9,-5.3 0.6,-11.1 2.6,-6.4 4.6,-7.2 4.7,-3.7 3.9,-4.9 -4.9,-1.9 0.6,-16.1 0,0 -10.9,-9.2 -2.9,-5.9 -6.8,2.9 -5.7,-0.9 -3.2,2.3 -5.5,-1.7 -7.5,-11.4 -4,1.5 -7.9,-0.4 z" },
  { code: "CF", name: "Central African Rep.", d: "m 587,398.1 -1,-0.7 -4.2,-4 -0.9,-4.3 1.9,-5.7 -0.1,-5.7 -7.2,-8.6 -1.5,-5.9 -7.7,2.3 -6,5.6 -8.6,15.1 -11.3,6.4 -11.8,-0.8 -3.4,1.2 1.2,4.9 -6.3,4.8 -5.1,5.4 -15.3,5.3 -3,-3.1 -2.1,-0.3 -2.2,3.6 -10,1 -6.1,14 -2.9,2.6 -0.8,10.7 1.2,5.8 -0.9,4.1 5.8,7.3 1,4.9 4.6,7.2 5.6,4.4 0.6,6.3 1.3,4 6.3,-12.8 7.3,-7.4 8.2,2.4 7.9,0.7 1,-9.6 4.7,-7.1 6.5,-4.4 10.1,4.7 7.8,5.1 9,1.4 9.1,2.7 3.6,-8.4 1.6,-1.1 5.6,1.4 13.5,-6.9 4.9,3 3.9,-0.5 1.8,-3.3 4.5,-1.2 9.2,1.4 7.9,0.4 4,-1.5 -2,-4.4 -9.2,-5.5 -3.2,-8.3 -5.2,-6 -8.3,-7.2 -0.1,-4.5 -6.8,-5.5 -8.4,-5.4 z" },
  { code: "CG", name: "Congo", d: "m 521.5,468.8 -7.9,-0.7 -8.2,-2.4 -7.3,7.4 -6.3,12.8 -0.9,7.5 -9.7,-3.3 -9.9,-3.6 -15.4,-0.6 -0.9,6.1 3.4,7.1 9.1,-1.1 3.1,2.7 -5.3,16.1 5.8,8.2 1.3,10.8 -1.6,9.2 -3.7,6.5 -10.8,-0.6 -6.5,-6.6 -1,6.1 -8.3,1.7 -4.2,3.5 4.6,9.1 -9.3,7.7 9.9,14.6 5,-6 3.7,-2.3 4.6,4.8 3.2,1.4 4.2,-5.3 6.6,0.1 0.8,3.9 4.5,2.5 7.2,-8.7 7.2,-6.8 3.1,-4.4 -0.3,-11.4 5.3,-13.4 5.6,-7.1 8.1,-6.7 1.4,-4.4 0.3,-5.1 2,-4.8 -0.7,-7.8 1.5,-12.3 2.4,-8.6 3.6,-7.4 0.7,-8.4 z" },
  { code: "CI", name: "Côte d'Ivoire", d: "m 230.4,373.8 -5,2.1 -2.9,1.7 -1.8,-5.9 -3.5,1.6 -2.1,-0.3 -2.3,4 -9.4,-0.1 -3.3,-2.1 -1.6,1.3 -2.5,1.1 -1,4.7 2.8,5.7 3,11.1 -4.6,1.6 -1.1,1.9 0.9,2.7 -0.8,6.1 -1.9,0 -0.6,4 1.2,6.7 -2.7,6.1 3.6,3.8 3.8,0.9 5.2,5.8 0.3,5.5 -1.1,1.7 -1,11.4 2.3,0.4 12.1,-5.1 8.5,-4 14.5,-2.4 7.8,-0.2 8.5,2.7 5.6,-0.1 0.5,-5.5 -5.2,-11.9 3.2,-15.6 5.1,-11.6 -3.2,-19.7 -8.3,-3.6 -5.7,0.6 -4.3,3.4 -5.4,-2.9 -2.1,-4.6 -5.5,-3 z" },
  { code: "CM", name: "Cameroon", d: "m 477.5,366.6 0.4,-9.2 -1,-9.1 -4.9,-8.9 -3.4,0.8 -0.4,4.4 4.9,5.5 -1.3,2.5 -0.5,4.6 -10.2,10.7 -3.1,8.8 -1.6,7.2 -2.6,3.1 -2.4,9.7 -6.4,5.7 -1.9,7 -2.7,5.6 -1.1,5.7 -8.3,4.7 -6.9,-5.7 -4.6,0.2 -7.2,8.1 -3.6,0.1 -5.7,13.4 -3.1,9.8 -0.1,3.8 3.1,2 2.5,6.2 5.6,2.3 4.8,9.2 -1.8,10.9 19.9,0.3 5.8,-0.9 7.4,1.9 7.3,-1.8 1.5,0.7 15.4,0.6 9.9,3.6 9.7,3.3 0.9,-7.5 -1.3,-4 -0.6,-6.3 -5.6,-4.4 -4.6,-7.2 -1,-4.9 -5.8,-7.3 0.9,-4.1 -1.2,-5.8 0.8,-10.7 2.9,-2.6 6.1,-14 1.8,-3.7 -3.9,-9.6 -1.8,-5.7 -5.3,-2.3 -7.2,-8.1 2.5,-6.5 5.6,1.3 3.4,-0.9 6.8,0.1 -6.8,-12.6 z" },
  { code: "DJ", name: "Djibouti", d: "m 820.3,358.7 -5.3,-3.8 6.8,-3.3 0.1,-5.7 -3,-4.3 -3.6,3.4 -5.2,-1.2 -4,6.1 -3.9,6.5 1.1,3.8 0.3,4.2 6.8,0.2 2.9,-0.9 2.8,2.4 4.2,-7.4 z" },
  { code: "DZ", name: "Algeria", d: "M 392.4,5.7 384.6,6.5 379.8,3.3 367.6,3.4 357,8.9 351.2,6.8 332.3,8 l -19.4,2.5 -11,4.3 -7.2,5.8 -12.4,2.4 -11.1,7.7 4.2,9 0.7,8.4 3.9,14.7 3.1,2.9 -2.2,5.4 -15.2,2.3 -5.4,5.1 -6.7,1.2 -0.6,10.2 -13.8,5.4 -4.6,7 -9.6,3.7 -11.8,2.1 -19.2,10.2 -0.2,16.3 0,1 -0.3,2.7 44.1,33.5 40,30.2 40.4,30.2 2.9,6.4 7.5,4 5.5,2.2 0.2,8.8 13.3,-1.3 16.9,-6.2 34.5,-27.1 40.5,-26.4 -5.4,-8.7 -9.6,-6.4 -5.5,2.5 -4.3,-7.7 -0.6,-5.9 -7.2,-10.1 4.6,-5.8 -1.3,-8.7 1.4,-7.6 -1,-6.3 1.8,-11.3 -0.8,-6.4 -4.1,-12.2 -5.7,-24.7 -7.3,-5.6 -0.2,-3.3 -9.7,-8.3 -1.3,-10.4 7,-7.8 2.4,-11.6 -2.3,-13.4 2.2,-7.2 z" },
  { code: "EG", name: "Egypt", d: "m 628.8,88.1 -11.9,-4 -11.5,-3.7 -15.6,0.2 -3.7,6.6 2.2,5.9 -2.4,8.5 4.2,11.2 2.9,49.2 2.2,50.9 48.1,0 46.4,0 47.4,0 -2.2,-2.8 -14.7,-12.4 -0.9,-9 2.2,-2.4 -11.6,-15.3 -4.4,-7.9 -4.9,-7.5 -10.5,-21.6 -8.4,-13.9 -6.1,-14.5 1.1,-1.3 10.1,19.8 5.8,6.2 4.3,4.4 2.5,-2.4 2.7,-7.2 1.6,-10.4 2.8,-5.6 -1.5,-3.5 -8.5,-20.1 0,0 -5.4,3.4 -9.2,-0.8 -9.6,-3.2 -2.3,4.5 -3.8,-6.8 -8.5,-1.8 -10.2,1.2 -4.5,3.9 -8.6,4.4 -5.6,-2.2 z" },
  { code: "EH", name: "W. Sahara", d: "m 193.8,134.6 -1.8,0 0,0 0.1,7.5 -7.3,0.4 -3.9,3.2 -5.4,0 -4.2,-1.8 -10,1.4 -4.2,10.8 -3.7,1.1 -6,17.4 -16.9,15 -4.4,19.1 -5,6.2 -1.6,5 -27,1.1 -0.2,-0.1 -0.6,5.9 2.7,-4.6 46.9,0.1 -1.9,-20 3.1,-7.1 11.2,-1.3 0.4,-35.4 38.9,0.7 0.5,-20.9 0.3,-2.7 0,-1 z" },
  { code: "ER", name: "Eritrea", d: "m 777.6,303.8 -7,-6.8 -4,-12.7 -7.8,-16 -5.7,7.9 -8.8,2.3 -3.6,4.2 -0.7,9.2 -4.3,20.3 1.5,5.6 14.3,2.9 3.3,-10.4 7.6,6.3 7,-3.2 3,2.9 8.3,0.1 10.8,5.6 3.4,4.8 5.5,4.4 5.4,8.1 4.3,4.5 5.2,1.2 3.6,-3.4 -6.2,-4.2 -4,-4.7 -6.9,-8 -7.1,-7.9 -17.1,-13 z" },
  { code: "ET", name: "Ethiopia", d: "m 754.8,310.3 -3.3,10.4 -14.3,-2.9 -1.4,11.9 -4.5,13.6 -7.1,6.8 -4.8,10.6 -1.1,5.7 -5.6,3.8 -3.3,14.5 0.1,1.7 0.4,10.8 -1.8,4.2 -6.4,0.3 -4,7.9 7.5,1 6.3,6.7 2.2,5.6 5.7,3.2 7.4,15 6.4,2.4 0.1,7.7 4.2,4.6 8.5,0 15.7,11.7 3.8,0.2 2.9,-0.4 2.7,1.6 8.2,1.1 3.5,-5.8 11.1,-5.8 4.9,4.7 8.4,0 3.3,-4.4 7.8,-0.2 10.7,-9.8 15.9,-0.6 33.5,-41.5 -10.3,0.1 -40.3,-16.4 -4.8,-5 -4.6,-6.6 -4.8,-7.7 2.5,-4.9 -2.8,-2.4 -2.9,0.9 -6.8,-0.2 -0.3,-4.2 -1.1,-3.8 3.9,-6.5 4,-6.1 -4.3,-4.5 -5.4,-8.1 -5.5,-4.4 -3.4,-4.8 -10.8,-5.6 -8.3,-0.1 -3,-2.9 -7,3.2 -7.6,-6.3 z" },
  { code: "GA", name: "Gabon", d: "m 455.9,485.9 -1.5,-0.7 -7.3,1.8 -7.4,-1.9 -5.8,0.9 0.1,16.7 -17.7,-0.2 -4.2,0.8 -2.4,10.3 -3,10.1 -2.7,4.4 -0.3,4.6 7.3,14.3 8.1,11.4 12.5,14 9.3,-7.7 -4.6,-9.1 4.2,-3.5 8.3,-1.7 1,-6.1 6.5,6.6 10.8,0.6 3.7,-6.5 1.6,-9.2 -1.3,-10.8 -5.8,-8.2 5.3,-16.1 -3.1,-2.7 -9.1,1.1 -3.4,-7.1 0.9,-6.1 z" },
  { code: "GH", name: "Ghana", d: "m 296.4,364.9 -5.6,-1.1 -3.9,2.2 -5.4,-1 -21.1,0.6 -0.3,7.9 1.6,10.4 3.2,19.7 -5.1,11.6 -3.2,15.6 5.2,11.9 -0.5,5.5 10.9,3.9 11,-4 6.7,-4.7 19.2,-8.1 -2.8,-4.9 -3.2,-8.8 -1,-6.8 2.7,-12.5 -3,-5 -1.2,-10.9 0,-10.1 -5.1,-7.1 0.9,-4.3 z" },
  { code: "GM", name: "Gambia", d: "m 91.9,335.4 11,0.2 3,-1.9 2.2,-0.1 4.5,-3.2 5.2,2.9 5.2,0.3 5.3,-3.1 -2.4,-4 -4,2.3 -3.8,-0.1 -4.7,-3.4 -3.8,0.2 -2.8,3.3 -13.2,0.4 -1.7,6.2 z" },
  { code: "GN", name: "Guinea", d: "m 156.4,345.2 -1.8,0.7 -6.6,-1.1 -0.9,1.6 -2.7,0.3 -8.7,-3.4 -5.8,-0.1 -0.3,4.7 -1.3,1.4 0.9,4.6 -1.9,1.8 -2.7,0.1 -3.2,2.3 -3.7,-0.3 -5.5,6.8 3.6,2.2 1.7,3.1 1.3,6.1 3,2.7 3.1,1.8 4.7,5.4 5.3,8.2 6.5,-6.1 1.5,-3.8 2.1,-3 3.3,-0.3 2.9,-2.6 9.7,0 3.3,5 2.6,5.8 -0.4,4 1.9,3.6 -0.1,5.1 3.3,-0.8 2.6,-0.3 3.2,-1.6 5.1,8.5 -0.9,5.6 2.4,2.9 3.4,0.1 2.6,-5.6 3.4,0.4 1.9,0 0.8,-6.1 -0.9,-2.7 1.1,-1.9 4.6,-1.6 -3,-11.1 -2.8,-5.7 1,-4.7 2.5,-1.1 -3.7,-4 0.7,-4.1 -1.6,-1.6 -2.6,1.3 0.6,-4.5 2.5,-3.5 -5,-5.8 -1.4,-3.8 -2.7,-3.1 -2.4,-0.3 -2.9,1.9 -4,1.8 -3.3,3 -5.2,-1.1 -3.3,-3.5 -2,-0.4 -3.2,1.8 -2,0 -0.6,-5 z" },
  { code: "GQ", name: "Eq. Guinea", d: "m 433.9,486 -19.9,-0.3 -4.1,15.5 2.2,2.1 4.2,-0.8 17.7,0.2 -0.1,-16.7 z" },
  { code: "GW", name: "Guinea-Bissau", d: "m 129.9,343.2 -22.4,-0.6 -3.3,1.6 -4,-0.5 -6.5,2.3 0.7,2.9 3.7,3 -0.1,2.1 2.7,3.9 5.1,0.9 6.4,5.8 5.5,-6.8 3.7,0.3 3.2,-2.3 2.7,-0.1 1.9,-1.8 -0.9,-4.6 1.3,-1.4 0.3,-4.7 z" },
  { code: "KE", name: "Kenya", d: "m 807.2,463.1 -8.4,0 -4.9,-4.7 -11.1,5.8 -3.5,5.8 -8.2,-1.1 -2.7,-1.6 -2.9,0.4 -3.8,-0.2 -15.7,-11.7 -8.5,0 -4.2,-4.6 -0.1,-7.7 -6.4,-2.4 -8.1,9.1 -7.4,8.3 5.9,9.6 1.5,7 5.5,15.8 -4.4,10.1 -5.9,9.2 -3.5,5.6 0,0.7 2.9,5.2 -0.8,10.3 44.1,28.2 0.7,8 17.3,13.8 5,-4.6 2.5,-9.2 4,-5.5 1.9,-9.8 4.6,-1 3.1,-5.8 8.6,-5.5 -7.2,-11.4 -0.4,-50.4 10.5,-15.7 z" },
  { code: "LR", name: "Liberia", d: "m 193.3,411 -3.4,-0.4 -2.6,5.6 -3.4,-0.1 -2.4,-2.9 0.9,-5.6 -5.1,-8.5 -3.2,1.6 -2.6,0.3 -5.7,6.5 -5.5,7.5 -0.7,4 -2.9,4.4 8.1,8.9 10.4,7.6 11,10.5 12.6,6.6 3.2,-0.1 1,-11.4 1.1,-1.7 -0.3,-5.5 -5.2,-5.8 -3.8,-0.9 -3.6,-3.8 2.7,-6.1 -1.2,-6.7 0.6,-4 z" },
  { code: "LS", name: "Lesotho", d: "m 625.3,939.9 2.5,-4.4 6.7,-2.2 2.4,-4.5 4.1,-6.7 -3.8,-4.2 -4.8,-4.2 -5.7,2.8 -6.8,5.4 -6.9,8.7 8,10.6 4.3,-1.3 z" },
  { code: "LY", name: "Libya", d: "m 589.8,80.6 -3.1,-4.5 -11.7,-1.6 -3.9,-2.4 -4.4,0 -4.4,-6.2 -15.9,-2.8 -7.9,1.8 -7.9,6.5 -3.3,6.7 3.4,10.6 -5.3,6.3 -5.5,3.6 L 507,91.7 490.3,86 479.7,83.3 473.6,71 l -15.7,-6.1 -9.8,-2.3 -4.8,1.2 -13.8,-4.8 -0.3,10.6 -5.6,4 -3.4,4.4 -7.9,5.3 1.5,5.7 -0.9,5.8 -5.6,3.2 4.1,12.2 0.8,6.4 -1.8,11.3 1,6.3 -1.4,7.6 1.3,8.7 -4.6,5.8 7.2,10.1 0.6,5.9 4.3,7.7 5.5,-2.5 9.6,6.4 5.4,8.7 19,6 6.9,7.5 8.3,-5.1 11.9,-7.6 48.4,26.5 48.7,26.5 -0.1,-5.8 13.8,0 -1,-27.7 -2.2,-50.9 -2.9,-49.2 -4.2,-11.2 2.4,-8.5 -2.2,-5.9 3.7,-6.6 z" },
  { code: "MA", name: "Morocco", d: "m 271.2,30.7 -5,-0.1 -11.9,-3.1 -11,0.9 -6.8,-5.9 -8.5,-0.1 -3.8,8.6 -8,14.5 -8.7,5.7 -11.8,6.4 -7.7,9.3 -1.8,7.3 -4.8,11.8 2.5,17.2 -10.1,11.5 -6,3.7 -9.6,9.4 -11,1.6 -6.1,5.3 -0.2,0.2 -7.9,14.1 -8.1,5.1 -4.5,8.5 -0.5,7.4 -3.4,8.1 -4,2.2 -6.9,8.8 -4.4,9.8 0.7,4.6 -4.1,7.3 -4.7,3.7 -0.8,6.4 0.2,0.1 27,-1.1 1.6,-5 5,-6.2 4.4,-19.1 16.9,-15 6,-17.4 3.7,-1.1 4.2,-10.8 10,-1.4 4.2,1.8 5.4,0 3.9,-3.2 7.3,-0.4 -0.1,-7.5 0,0 1.8,0 0.2,-16.3 19.2,-10.2 11.8,-2.1 9.6,-3.7 4.6,-7 13.8,-5.4 0.6,-10.2 6.7,-1.2 5.4,-5.1 15.2,-2.3 2.2,-5.4 -3.1,-2.9 -3.9,-14.7 -0.7,-8.4 -4.2,-9 z" },
  { code: "MG", name: "Madagascar", d: "m 902.9,704.8 -2.5,-9.1 -3,-5.9 -3.9,-5.9 -4.3,6.2 -0.7,8.3 -7.1,9.6 -5.1,-1.7 1.3,6 -4,6.9 -10.4,8.5 -7.3,7.9 -5.4,0.2 -4.6,2.5 -6.9,2.8 -6,0.6 -2.2,8.7 -4.7,7.8 0.2,12.7 1.7,8.7 2.4,6.6 -1.7,8.8 -6.4,10.5 -0.3,4.6 -5.7,2.4 -2.8,10 0.4,9.9 3.4,11 -0.1,12.3 2.6,7.3 9.1,5 6.5,3.5 10.9,-5.8 9.9,-3.3 6.8,-16.1 6.1,-19.2 9.3,-26.2 7.3,-19.1 5.9,-16.1 1.6,-11.7 3.5,-3.2 1.5,-5.9 -1.7,-10.2 2.6,-4.1 3.5,8.1 2.4,-4.1 1.7,-6.6 -2.8,-6.5 -1,-16.7 z" },
  { code: "ML", name: "Mali", d: "m 347.4,252.3 -13.3,1.3 -0.2,-8.8 -5.5,-2.2 -7.5,-4 -2.9,-6.4 -40.4,-30.2 -40,-30.2 -18.2,0.2 5.1,59.7 5.4,59.7 2,1.8 -2.7,9.6 -48.5,0.2 -1.9,3.1 -4.6,-0.9 -6.9,2.7 -8.4,-3.8 -3.8,0.3 -2.2,8.2 -4.1,2.5 0.4,8.6 2.3,7.9 4.5,3.9 1,5.3 -0.6,4.4 0.6,5 2,0 3.2,-1.8 2,0.4 3.3,3.5 5.2,1.1 3.3,-3 4,-1.8 2.9,-1.9 2.4,0.3 2.7,3.1 1.4,3.8 5,5.8 -2.5,3.5 -0.6,4.5 2.6,-1.3 1.6,1.6 -0.7,4.1 3.7,4 1.6,-1.3 3.3,2.1 9.4,0.1 2.3,-4 2.1,0.3 3.5,-1.6 1.8,5.9 2.9,-1.7 5,-2.1 -0.8,-8 3.4,-5.9 -0.3,-4.7 9.7,-11.4 1.8,-9.5 3.4,-3.4 5.8,1.9 5.1,-2.8 1.7,-3.6 9.4,-6.2 2.3,-4.3 11.3,-5.8 6.7,-1.9 3,2.6 7.8,0 7.7,-0.6 4.5,-4.9 16.5,-1.2 10.7,-2.2 1,-8.5 6.6,-9.2 -0.3,-31.9 z" },
  { code: "MR", name: "Mauritania", d: "m 237.6,171.8 -44.1,-33.5 -0.5,20.9 -38.9,-0.7 -0.4,35.4 -11.2,1.3 -3.1,7.1 1.9,20 -46.9,-0.1 -2.7,4.6 6.1,6 3,6.5 -1.4,6.9 1.3,6.9 1,13.7 -1.8,13 -3.5,6.8 0.9,7.5 4.2,-4.5 6,1.2 5.9,-3 6.8,-0.1 5.7,4 7.9,3.7 7.2,10.2 7.8,9.5 4.1,-2.5 2.2,-8.2 3.8,-0.3 8.4,3.8 6.9,-2.7 4.6,0.9 1.9,-3.1 48.5,-0.2 2.7,-9.6 -2,-1.8 -5.4,-59.7 -5.1,-59.7 18.2,-0.2 z" },
  { code: "MW", name: "Malawi", d: "m 714.6,711.7 0.3,-5.2 -2.7,-4.1 0.4,-6 -3.3,-10.2 3.7,-7.7 -0.2,-16.7 -4.1,-8.9 0.4,-1.5 0,0 -2.3,-3.8 -11.9,-2.6 5.6,6.2 2.8,11.7 -2.2,3.8 -2.7,11.2 2,11.5 -4,4.8 -4.1,12.8 6.2,3.6 6.8,6.6 3.3,-1.2 4.7,3.5 0.5,5.5 -2.9,6.5 0.5,9.7 7.5,8.6 4.1,-9.6 5.4,-3 -0.3,-17.8 -4.6,-10 -4.2,-4.4 -0.7,0 0.1,1.9 2.3,0.5 2.2,7.4 -0.4,1.7 -4.1,-5.3 -2.2,3.4 -1.9,-2.9 z" },
  { code: "MZ", name: "Mozambique", d: "m 788.2,666.2 -1.7,-6.2 0,0 0,0 -10,8.1 -13.4,5.3 -7.3,-0.2 -4.5,4.2 -8.4,0.3 -3.3,1.8 -14.4,-3.9 -4.7,0.5 -3.3,13.1 1.4,15.8 0.7,0 4.2,4.4 4.6,10 0.3,17.8 -5.4,3 -4.1,9.6 -7.5,-8.6 -0.5,-9.7 2.9,-6.5 -0.5,-5.5 -4.7,-3.5 -3.3,1.2 -6.8,-6.6 -37.1,11.4 0.8,9.9 0.6,5.1 10,-0.3 5.5,3 2.5,3.4 5.7,1 6.1,4.4 -0.8,17.5 -2.8,9.6 -1,10.4 1.7,4.1 -1.7,8.1 -1.9,1.3 -3.6,9.9 -13.4,15.7 4.7,19.5 2.5,9.9 -3,15.4 0.7,5 1.3,6.2 0.6,6.1 9,0.1 1.5,-7.3 -2.9,-0.9 -0.6,-5.8 5.5,-5.2 14.8,-7.5 10.1,-4.6 5.3,-5 2.1,-5.7 -2.7,-2.4 2.4,-6.4 1.1,-13.6 -2.2,0.7 0.1,-4.1 -1.9,-8.1 -5.2,-10.5 1.6,-9.9 5.1,-3.2 8.9,-9.8 4.7,-2.5 14.4,-14.9 14,-6.7 11.3,-5.3 8.1,-8.5 5.2,-9.6 4.1,-9.9 -1.8,-6.8 0.4,-21.6 -1,-12.2 0.9,-13.8 z" },
  { code: "NA", name: "Namibia", d: "m 576,759.7 -22.4,5.7 -29.1,-2 -8.2,-6.6 -48.8,0.6 -1.9,1 -7.1,-6.3 -7.8,-0.4 -7.2,2.3 -5.9,2.7 0.6,10.6 9.5,13.5 2.5,8.7 6,16.6 5.9,11.4 4.6,5.7 1.3,7.6 -0.1,16.5 3.4,21.3 2.6,10.1 2.2,13.4 4.3,10.1 8.3,10.5 6,-6.8 4.5,3.7 1.7,6 5.2,1 7.3,2.6 6.4,-1 10.8,-7.1 2.2,-51.1 1.4,-40.4 11.8,-0.5 1.9,-49.3 9,-0.4 18.7,-4.9 4.4,5.7 7.9,-5.4 3.6,0 6.9,-3.1 0,-1.2 -4.7,-3.1 -7.8,-0.8 -9.9,3.1 z" },
  { code: "NE", name: "Niger", d: "m 458.3,198.6 -19,-6 -40.5,26.4 -34.5,27.1 -16.9,6.2 0.3,31.9 -6.6,9.2 -1,8.5 -10.7,2.2 -16.5,1.2 -4.5,4.9 -7.7,0.6 -1,6.7 1.6,6.3 6.9,9 0.4,6.7 14,3.1 -0.3,9.5 4.1,-4 4.3,-0.1 9.3,8 0.8,-12.4 3.5,-5.5 1.6,-8 3.2,-3 13,-1.6 12.2,5.1 4.6,5.3 6.1,0.2 5.8,-3.4 14.7,7.1 6.2,-0.3 7.1,-5.9 7.1,0.4 3.5,-1.9 6.5,0.8 9.4,4 9.4,-7.7 2.9,0.6 8.4,15.1 2.2,-0.3 0.4,-4.4 3.4,-0.8 1.1,-6.5 -7.8,-0.3 -0.1,-8.9 -5.1,-5.2 4.9,-18.2 15.2,-13 0.2,-18 4,-28.1 2.5,-6 -5.1,-4.7 -0.3,-4.4 -4.6,-3.6 -3.4,-21.5 -8.3,5.1 -6.9,-7.5 z" },
  { code: "NG", name: "Nigeria", d: "m 468.2,344.6 -2.2,0.3 -8.4,-15.1 -2.9,-0.6 -9.4,7.7 -9.4,-4 -6.5,-0.8 -3.5,1.9 -7.1,-0.4 -7.1,5.9 -6.2,0.3 -14.7,-7.1 -5.8,3.4 -6.1,-0.2 -4.6,-5.3 -12.2,-5.1 -13,1.6 -3.2,3 -1.6,8 -3.5,5.5 -0.8,12.4 -0.5,4.6 2.8,8.2 -2.4,5.6 1.3,3.7 -5.9,8.5 -3.7,4.3 -2.3,8.7 0.3,8.8 -0.6,22.3 10.7,0 9.2,-0.1 8.6,9.1 4.1,10 6.5,8.6 9.8,0.3 4.7,-3.1 4.6,0.8 12.7,-5 3.1,-9.8 5.7,-13.4 3.6,-0.1 7.2,-8.1 4.6,-0.2 6.9,5.7 8.3,-4.7 1.1,-5.7 2.7,-5.6 1.9,-7 6.4,-5.7 2.4,-9.7 2.6,-3.1 1.6,-7.2 3.1,-8.8 10.2,-10.7 0.5,-4.6 1.3,-2.5 -4.9,-5.5 z" },
  { code: "RW", name: "Rwanda", d: "m 667.9,533 -7.4,4.3 -2.9,-1.4 -3.5,3.8 -0.5,8.3 -1.7,1 -1.2,7.6 7.4,1.1 3.8,-7.9 6.5,0.9 0,0 3.5,-1.8 0.8,-8.1 -4.8,-7.8 z" },
  { code: "SD", name: "Sudan", d: "m 740,291.9 0.7,-9.2 3.6,-4.2 8.8,-2.3 5.7,-7.9 -6.9,-5.1 -4.8,-3.4 -5.3,-16.5 -2.5,-14.3 2.5,-2.5 -4.7,-13.6 -47.4,0 -46.4,0 -48.1,0 1,27.7 -13.8,0 0.1,5.8 2.4,54.9 -10.5,-0.9 -5.2,10.2 -3,8.5 2.6,3.2 -3.8,4.3 1.5,5.7 -3,5.8 -1.2,5 4.3,-0.8 2.6,5.4 0.3,8 4.6,4.1 -0.1,3.4 1.5,5.9 7.2,8.6 0.1,5.7 -1.9,5.7 0.9,4.3 4.2,4 1,0.7 3.8,-1.6 4.1,-2.6 2.9,-12.3 3.2,-6.4 8.8,-1.9 2.1,3.8 6.5,8 3.3,1.2 4.4,-2.3 8.7,0.4 1.8,2.9 12.1,0 0.3,-2.9 6.3,-2.6 1.1,-4 4.6,-2.9 10.4,8.1 6.2,-1.4 5.8,-10 6.5,-7.6 -1.3,-8.3 -3,-4 7.3,-0.8 0.7,-3 5.7,0.9 -1.2,10.2 1.7,10 6.5,5.5 1.5,4.7 0,6.9 1.7,0.3 -0.1,-1.7 3.3,-14.5 5.6,-3.8 1.1,-5.7 4.8,-10.6 7.1,-6.8 4.5,-13.6 1.4,-11.9 -1.5,-5.6 4.3,-20.3 z" },
  { code: "SL", name: "Sierra Leone", d: "m 171.5,401 -3.3,0.8 0.1,-5.1 -1.9,-3.6 0.4,-4 -2.6,-5.8 -3.3,-5 -9.7,0 -2.9,2.6 -3.3,0.3 -2.1,3 -1.5,3.8 -6.5,6.1 1.4,10.3 2.1,5 6.3,7.4 8.7,5.6 3.3,1 2.9,-4.4 0.7,-4 5.5,-7.5 5.7,-6.5 z" },
  { code: "SN", name: "Senegal", d: "m 148.8,315.1 -7.8,-9.5 -7.2,-10.2 -7.9,-3.7 -5.7,-4 -6.8,0.1 -5.9,3 -6,-1.2 -4.2,4.5 -3,7.1 -6.1,9.7 -5.4,2.6 6,4.9 4.8,10.8 13.2,-0.4 2.8,-3.3 3.8,-0.2 4.7,3.4 3.8,0.1 4,-2.3 2.4,4 -5.3,3.1 -5.2,-0.3 -5.2,-2.9 -4.5,3.2 -2.2,0.1 -3,1.9 -11,-0.2 1.8,10.6 6.5,-2.3 4,0.5 3.3,-1.6 22.4,0.6 5.8,0.1 8.7,3.4 2.7,-0.3 0.9,-1.6 6.6,1.1 1.8,-0.7 0.6,-4.4 -1,-5.3 -4.5,-3.9 -2.3,-7.9 -0.4,-8.6 z" },
  { code: "SO", name: "Somalia", d: "m 832.6,372.8 -5.7,-5.8 -2.5,-5.7 -4.1,-2.6 -4.2,7.4 -2.5,4.9 4.8,7.7 4.6,6.6 4.8,5 40.3,16.4 10.3,-0.1 -33.5,41.5 -15.9,0.6 -10.7,9.8 -7.8,0.2 -3.3,4.4 -10.5,15.7 0.4,50.4 7.2,11.4 2.7,-3.3 2.9,-7.3 13.4,-16.7 11.4,-10.6 18.1,-13.7 12.1,-11.2 14.1,-18.9 10.1,-15.5 10,-20.2 7,-17.7 5.4,-15.5 2.9,-14.9 2.4,-5 -0.4,-7.3 0.8,-8 -0.5,-3.9 -4.6,0.1 -5.5,4.7 -6.4,1.4 -5.5,2.1 -3.9,0.2 0,0 -6.9,0.5 -4.2,2.6 -6,0.9 -10.5,4.3 -13.2,1.6 -11.3,3.5 -6.1,0 z" },
  { code: "SS", name: "S. Sudan", d: "m 707.8,379.2 -1.5,-4.7 -6.5,-5.5 -1.7,-10 1.2,-10.2 -5.7,-0.9 -0.7,3 -7.3,0.8 3,4 1.3,8.3 -6.5,7.6 -5.8,10 -6.2,1.4 -10.4,-8.1 -4.6,2.9 -1.1,4 -6.3,2.6 -0.3,2.9 -12.1,0 -1.8,-2.9 -8.7,-0.4 -4.4,2.3 -3.3,-1.2 -6.5,-8 -2.1,-3.8 -8.8,1.9 -3.2,6.4 -2.9,12.3 -4.1,2.6 -3.8,1.6 8.4,5.4 6.8,5.5 0.1,4.5 8.3,7.2 5.2,6 3.2,8.3 9.2,5.5 2,4.4 7.5,11.4 5.5,1.7 3.2,-2.3 5.7,0.9 6.8,-2.9 2.9,5.9 10.9,9.2 0,0 5,-3.8 7.8,3.1 9.8,-3.3 8.6,0.1 7.4,-6.4 7.4,-8.3 8.1,-9.1 -7.4,-15 -5.7,-3.2 -2.2,-5.6 -6.3,-6.7 -7.5,-1 4,-7.9 6.4,-0.3 1.8,-4.2 -0.4,-10.8 -1.7,-0.3 0,-6.9 z" },
  { code: "SZ", name: "Swaziland", d: "m 674,874.9 -5.8,-2.6 -3.5,1 -1.4,4 -3.6,5.2 -0.2,4.8 6.6,7.5 7,-1.5 2.8,-6.1 -0.6,-6.1 -1.3,-6.2 z" },
  { code: "TD", name: "Chad", d: "m 582.5,246.4 -48.7,-26.5 -48.4,-26.5 -11.9,7.6 3.4,21.5 4.6,3.6 0.3,4.4 5.1,4.7 -2.5,6 -4,28.1 -0.2,18 -15.2,13 -4.9,18.2 5.1,5.2 0.1,8.9 7.8,0.3 -1.1,6.5 4.9,8.9 1,9.1 -0.4,9.2 6.8,12.6 -6.8,-0.1 -3.4,0.9 -5.6,-1.3 -2.5,6.5 7.2,8.1 5.3,2.3 1.8,5.7 3.9,9.6 -1.8,3.7 10,-1 2.2,-3.6 2.1,0.3 3,3.1 15.3,-5.3 5.1,-5.4 6.3,-4.8 -1.2,-4.9 3.4,-1.2 11.8,0.8 11.3,-6.4 8.6,-15.1 6,-5.6 7.7,-2.3 0.1,-3.4 -4.6,-4.1 -0.3,-8 -2.6,-5.4 -4.3,0.8 1.2,-5 3,-5.8 -1.5,-5.7 3.8,-4.3 -2.6,-3.2 3,-8.5 5.2,-10.2 10.5,0.9 -2.4,-54.9 z" },
  { code: "TG", name: "Togo", d: "m 307.1,365.2 -10.7,-0.3 -0.9,4.3 5.1,7.1 0,10.1 1.2,10.9 3,5 -2.7,12.5 1,6.8 3.2,8.8 2.8,4.9 9.8,-3 -3,-9.5 0.5,-31.8 -2.5,-2.8 -0.4,-6.8 -4.3,-4.9 -3.7,-4.1 1.6,-7.2 z" },
  { code: "TN", name: "Tunisia", d: "m 429.5,59 -4.5,-2.2 -3.2,-6.6 -6,-0.2 -2.4,-7.6 7.3,-7 1.1,-12.1 -4.1,-3.5 -0.2,-6.5 5.5,-7 -0.9,-2.7 -9.5,5.2 0.1,-7.1 -8.1,-1.7 -12.2,5.7 -2.2,7.2 2.3,13.4 -2.4,11.6 -7,7.8 1.3,10.4 9.7,8.3 0.2,3.3 7.3,5.6 5.7,24.7 5.6,-3.2 0.9,-5.8 -1.5,-5.7 7.9,-5.3 3.4,-4.4 5.6,-4 0.3,-10.6 z" },
  { code: "TZ", name: "Tanzania", d: "m 672.2,531.3 -4.3,1.7 4.8,7.8 -0.8,8.1 -3.5,1.8 0,0 0.6,5.4 2.6,3.2 0.1,4.5 -3,2.9 -4.9,7.2 -4.5,5 -1.2,0.2 -0.7,5.9 2.3,2 -0.5,5.9 2.3,5.5 -2.9,5.3 9.7,9.4 0.8,8.5 5.9,14.2 0,0 0.6,0.4 4.8,2.3 7.7,2.4 6.8,4.1 11.9,2.6 2.3,3.8 0,0 0.8,-2.7 6.2,7.4 0.6,14.5 3.9,5.3 -0.1,0.2 4.7,-0.5 14.4,3.9 3.3,-1.8 8.4,-0.3 4.5,-4.2 7.3,0.2 13.4,-5.3 10,-8.1 0,0 -4.4,-3 -4.7,-13.6 -4,-8.7 1,-6.6 -0.6,-4.2 3.5,-8.4 -0.3,-3.6 -7.7,-5 -0.6,-7.8 5.9,-17.1 -17.3,-13.8 -0.7,-8 -44.1,-28.2 0,0 -6,6.1 -4.1,6.3 4.8,4.7 -7,3.4 -1.5,-1.6 -7.1,0.9 -5.5,3.1 -3.3,-5.4 2.3,-9.7 0.5,-8.3 0,0 0,0 -13.4,-0.2 z" },
  { code: "UG", name: "Uganda", d: "m 711.3,458.5 -7.4,6.4 -8.6,-0.1 -9.8,3.3 -7.8,-3.1 -5,3.8 0,0 -0.6,16.1 4.9,1.9 -3.9,4.9 -4.7,3.7 -4.6,7.2 -2.6,6.4 -0.6,11.1 -2.9,5.3 -0.1,10.5 2.9,1.4 7.4,-4.3 4.3,-1.7 13.4,0.2 0,0 -0.7,-5.3 5.7,-8.1 7.7,-2 5.2,-3.3 6.3,2.7 0.6,1 0,-0.7 3.5,-5.6 5.9,-9.2 4.4,-10.1 -5.5,-15.8 -1.5,-7 -5.9,-9.6 z" },
  { code: "ZA", name: "South Africa", d: "m 522.3,999 5.3,-0.3 7.5,-5.3 10,-2.2 12.3,-5.5 4.7,0.7 7.2,-1.7 12.3,2.7 5.9,-2.6 6.9,2 1.8,-3.8 6,-0.8 12.6,-5.3 9.3,-6.3 8.9,-8.3 14.4,-14.2 7.5,-9.9 3.9,-7.1 5.5,-7 2.5,-2 8.6,-7 3.5,-6.2 2.3,-11.5 3.7,-10.1 -9,-0.1 -2.8,6.1 -7,1.5 -6.6,-7.5 0.2,-4.8 3.6,-5.2 1.4,-4 3.5,-1 5.8,2.6 -0.7,-5 3,-15.4 -2.5,-9.9 -4.7,-19.5 -6.3,-1.3 -4.1,1.6 -5.7,-2.3 -4.9,-0.2 -17.3,10.2 -11.2,10.3 -4.4,9.3 -3.9,5.2 -6.5,1.1 -2.4,6.6 -1.4,4.3 -7.8,3.2 -9.6,-0.6 -5.5,-3.9 -4.9,-1.7 -6,3.2 -3.2,6.6 -5.8,4.2 -6.2,6.2 -8.5,1.4 -2.5,-4.9 1.5,-8.4 -6.5,-13.2 -3.2,-2 -2.2,51.1 -10.8,7.1 -6.4,1 -7.3,-2.6 -5.2,-1 -1.7,-6 -4.5,-3.7 -6,6.8 7.7,17.9 0,0.1 5.4,11.7 6.9,12.8 -0.2,10.6 -3.9,2.5 3.2,9.3 -0.5,8.1 1.3,3.8 0.7,-1.9 4.6,6.2 3.8,0.2 4.6,5 z m 103,-59.1 -4.3,1.3 -8,-10.6 6.9,-8.7 6.8,-5.4 5.7,-2.8 4.8,4.2 3.8,4.2 -4.1,6.7 -2.4,4.5 -6.7,2.2 -2.5,4.4 z" },
  { code: "ZM", name: "Zambia", d: "m 671.3,636 -4.1,-1.1 0.7,-3 -2.1,-0.6 -16.4,2.3 -3.3,1.7 -3.6,8.8 2.6,6.1 -2.5,16.4 -1.9,13.9 3.2,2.4 8.4,5.4 3.4,-2.5 0.6,14.9 -9.3,-0.1 -4.8,-7.6 -4.3,-5.9 -9.2,-1.9 -2.6,-7.3 -7.5,4.4 -9.7,-2 -3.9,-6.2 -7.7,-1.3 -5.7,0.3 -0.6,-4.3 -4.2,-0.3 1.2,4.3 -1.5,6.7 2,6.5 -2,5.2 1,4.7 -25.3,-0.1 -1.6,44 7.8,11.3 7.6,8.6 9.9,-3.1 7.8,0.8 4.7,3.1 0,1.2 2.2,1 13.4,1.5 3.8,1.6 4.1,-0.3 7,-9 10.9,-11.4 4.4,-1 1.7,-4.8 7,-5.5 9.3,-1.9 -0.8,-9.9 37.1,-11.4 -6.2,-3.6 4.1,-12.8 4,-4.8 -2,-11.5 2.7,-11.2 2.2,-3.8 -2.8,-11.7 -5.6,-6.2 -6.8,-4.1 -7.7,-2.4 -4.8,-2.3 -0.6,-0.4 0,0 0.9,2.3 -2,0.8 -2.6,-2.9 z" },
  { code: "ZW", name: "Zimbabwe", d: "m 669.1,825.1 13.4,-15.7 3.6,-9.9 1.9,-1.3 1.7,-8.1 -1.7,-4.1 1,-10.4 2.8,-9.6 0.8,-17.5 -6.1,-4.4 -5.7,-1 -2.5,-3.4 -5.5,-3 -10,0.3 -0.6,-5.1 -9.3,1.9 -7,5.5 -1.7,4.8 -4.4,1 -10.9,11.4 -7,9 -4.1,0.3 -3.8,-1.6 -13.4,-1.5 4.2,11.1 2.3,2.4 3.5,8 13,15.2 5.1,1.5 -0.2,4.9 3.1,8.8 9.2,2.1 7.3,6.2 4.9,0.2 5.7,2.3 4.1,-1.6 6.3,1.3 z" },
];

/**
 * Island nations absent from the source SVG, as labeled dot markers.
 * Coordinates are approximate positions in the 1000×1001 viewBox —
 * nudge x/y freely. `anchor` places the label left or right of the dot.
 */
export const ISLAND_POSITIONS: Record<
  string,
  { x: number; y: number; name: string; anchor: "start" | "end" }
> = {
  CV: { x: 30, y: 295, name: "Cape Verde", anchor: "start" },
  ST: { x: 378, y: 515, name: "São Tomé and Príncipe", anchor: "start" },
  KM: { x: 792, y: 672, name: "Comoros", anchor: "end" },
  SC: { x: 958, y: 585, name: "Seychelles", anchor: "end" },
  MU: { x: 968, y: 797, name: "Mauritius", anchor: "end" },
};

/** Accra marker position (Ghana's south coast). Nudge freely. */
export const ACCRA_POSITION = { x: 292, y: 441 };

/**
 * Approximate centroids (bounding-box midpoints) of the four textile-detail
 * countries, for placing the "explorable" pulse marker. Nudge freely — this
 * is a separate, independent tier from the participants system: a country
 * can be in both, neither, or just one.
 */
export const TEXTILE_MARKER_POSITIONS: Record<string, { x: number; y: number }> = {
  GH: { x: 283, y: 408 },
  NG: { x: 401, y: 392 },
  ET: { x: 780, y: 385 },
  KE: { x: 759, y: 512 },
};

/**
 * Bounding boxes (SVG user-space units) for the same four countries, used
 * as a stable invisible hit-target. The visible path itself can't double
 * as the pointer target while it's being scaled for the zoom effect —
 * its rendered boundary moves as it grows, which can sweep across a
 * cursor near an edge and fire a spurious pointerleave that reverses the
 * animation, which sweeps the boundary back and re-triggers enter, in a
 * rapid feedback loop. A fixed-size rect sidesteps that entirely.
 */
const TEXTILE_HIT_BOUNDS: Record<string, { x: number; y: number; width: number; height: number }> = {
  GH: { x: 256.6, y: 363.8, width: 52.5, height: 88.3 },
  NG: { x: 329, y: 325.5, width: 144.1, height: 133.1 },
  ET: { x: 697.7, y: 310.3, width: 180.7, height: 159.7 },
  KE: { x: 710.4, y: 441.1, width: 96.8, height: 140.9 },
};

function participationLine(p: Participant) {
  return typeof p.exhibitors === "number"
    ? `${p.exhibitors} exhibitors`
    : "Participating";
}

/** Shared content for the cursor tooltip and the mobile/keyboard card. */
function ParticipantInfo({ p }: { p: Participant }) {
  return (
    <>
      <p className="font-display text-sm font-extrabold uppercase tracking-wide text-ink">
        {p.name}
      </p>
      <p className="mt-0.5 text-xs text-indigo">{participationLine(p)}</p>
      {p.sectors && p.sectors.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {p.sectors.map((s) => (
            <li
              key={s}
              className="rounded-full border border-hairline px-2 py-0.5 text-[10px] uppercase tracking-wider text-indigo"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
      <Link
        href="/exhibiting"
        className="mt-2 inline-block text-xs font-semibold text-gold-deep"
      >
        View exhibitors
      </Link>
    </>
  );
}

/** Content for the textile detail modal, shared across every input type
 * and viewport width. Sourced strictly from textileProfiles.ts. */
function TextileInfo({ t, headingId }: { t: TextileProfile; headingId?: string }) {
  return (
    <>
      <h2
        id={headingId}
        className="font-display text-2xl font-extrabold uppercase leading-none tracking-tight text-ink"
      >
        {t.country}
      </h2>
      <p className="mt-2 text-sm font-semibold text-gold-deep">{t.headline}</p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {t.materials.map((m) => (
          <li
            key={m}
            className="rounded-full border border-hairline px-2.5 py-1 text-[11px] uppercase tracking-wider text-indigo"
          >
            {m}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm leading-relaxed text-indigo">{t.description}</p>
    </>
  );
}

export default function AfricaMap({
  participants = defaultParticipants,
  className = "",
}: {
  participants?: Participant[];
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  // The element that opened the modal, so closing it (Escape, backdrop,
  // the close button) can return focus there instead of dropping it. The
  // trigger is always the SVG hit-rect, hence SVGElement rather than
  // HTMLElement.
  const lastTriggerRef = useRef<SVGElement | null>(null);
  // Persisted per-country scale (1 = rest, 1.2 = zoomed), so the reverse
  // tween starts from the actual current value rather than snapping.
  const textileScale = useRef<Record<string, number>>({});
  const [hoverCode, setHoverCode] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  // Textile-detail tier (materials-education feature): independent of the
  // participants tier above. Two states, matching the two-stage
  // interaction: hover/focus (`textileHover`) is a "this is clickable"
  // affordance only — it drives the map zoom and a pulsing ring cue, but
  // never reveals the detail content. Click/Enter/Space/tap
  // (`textileOpen`) is what actually opens the detail modal.
  const [textileHover, setTextileHover] = useState<string | null>(null);
  const [textileOpen, setTextileOpen] = useState<string | null>(null);
  // Modal stays mounted through its own exit animation (cleared once that
  // tween completes) so it doesn't just vanish, and keeps showing the
  // last-open country's content through that fade so it doesn't blank
  // mid-exit.
  const [modalMounted, setModalMounted] = useState(false);
  const [modalCode, setModalCode] = useState<string | null>(null);

  useEffect(() => {
    if (textileOpen) {
      setModalMounted(true);
      setModalCode(textileOpen);
    }
  }, [textileOpen]);

  const byCode = useMemo(
    () => new Map(participants.map((p) => [p.code, p])),
    [participants],
  );
  const textileByCode = useMemo(
    () => new Map(textileProfiles.map((t) => [t.code, t])),
    [],
  );

  const hoverParticipant = hoverCode ? byCode.get(hoverCode) : undefined;
  const selectedParticipant = selected ? byCode.get(selected) : undefined;
  // The country that should read as "zoomed" on the map: open takes
  // priority over hover (the country stays zoomed while its modal is open,
  // even after the cursor moves off it), otherwise whichever is
  // hovered/focused.
  const zoomCode = textileOpen ?? textileHover;
  const modalTextile = modalCode ? textileByCode.get(modalCode) : undefined;

  // Cursor-following tooltip, clamped inside the section bounds.
  const moveTooltip = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const wrap = wrapRef.current;
    const tip = tooltipRef.current;
    if (!wrap || !tip) return;
    const rect = wrap.getBoundingClientRect();
    let x = e.clientX - rect.left + 16;
    let y = e.clientY - rect.top + 20;
    x = Math.max(8, Math.min(x, rect.width - tip.offsetWidth - 8));
    y = Math.max(8, Math.min(y, rect.height - tip.offsetHeight - 8));
    tip.style.transform = `translate(${x}px, ${y}px)`;
  };

  const interactiveProps = (code: string, name: string) => ({
    tabIndex: 0,
    role: "button",
    "aria-label": `${name}, ${participationLine(byCode.get(code)!).toLowerCase()}, view exhibitors`,
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") setHoverCode(code);
    },
    onPointerLeave: () => setHoverCode(null),
    onPointerMove: moveTooltip,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelected(code);
    },
    onFocus: () => setSelected(code),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setSelected(code);
      }
    },
  });

  // Textile-tier props. Two-stage interaction: hover/focus is an
  // affordance-only cue (map zoom + pulsing ring, no content), while
  // click/Enter/Space/tap opens the detail modal — on touch, where there's
  // no real hover, tapping goes straight to opening it. Takes priority
  // over `interactiveProps` above for any country in both tiers (only
  // Ghana currently). Attached to a stable invisible hit-rect (see
  // TEXTILE_HIT_BOUNDS), not the path itself — the path is what scales for
  // the zoom effect, and a moving hit-target would fire spurious
  // leave/enter as its boundary sweeps past the cursor, fighting its own
  // animation.
  const textileInteractiveProps = (code: string, country: string) => ({
    tabIndex: 0,
    role: "button",
    "aria-label": `${country}, view textile details`,
    "aria-haspopup": "dialog" as const,
    "aria-expanded": textileOpen === code,
    onPointerEnter: (e: React.PointerEvent<SVGRectElement>) => {
      if (e.pointerType === "mouse") setTextileHover(code);
    },
    onPointerLeave: (e: React.PointerEvent<SVGRectElement>) => {
      if (e.pointerType === "mouse") setTextileHover(null);
    },
    onPointerUp: (e: React.PointerEvent<SVGRectElement>) => {
      if (e.pointerType === "touch") {
        e.stopPropagation();
        lastTriggerRef.current = e.currentTarget;
        setTextileOpen(code);
      }
    },
    // Browsers synthesize a click after a touch's pointerup regardless of
    // that event's own stopPropagation — without also stopping this one,
    // it bubbles to the SVG's onClick (which clears the participant
    // selection) and, for a real mouse click, this is also what opens the
    // modal.
    onClick: (e: React.MouseEvent<SVGRectElement>) => {
      e.stopPropagation();
      lastTriggerRef.current = e.currentTarget;
      setTextileOpen(code);
    },
    onFocus: () => setTextileHover(code),
    onBlur: () => setTextileHover((cur) => (cur === code ? null : cur)),
    onKeyDown: (e: React.KeyboardEvent<SVGRectElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        lastTriggerRef.current = e.currentTarget;
        setTextileOpen(code);
      }
    },
  });

  // Entry animation (once, on scroll into view) + Accra pulse.
  // Reduced motion: no tweens run — the DOM already holds the final state.
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      gsap.fromTo(
        ".accra-pulse",
        { scale: 1, opacity: 0.5 },
        {
          scale: 1.8,
          opacity: 0,
          duration: 2,
          repeat: -1,
          ease: "power1.out",
          transformOrigin: "50% 50%",
        },
      );

      // Smaller-scale pulse marking the four textile-detail countries as
      // "explorable", independent of the participants tier.
      gsap.fromTo(
        ".textile-pulse",
        { scale: 1, opacity: 0.55 },
        {
          scale: 1.5,
          opacity: 0,
          duration: 1.8,
          repeat: -1,
          ease: "power1.out",
          transformOrigin: "50% 50%",
          stagger: 0.3,
        },
      );

      gsap.set("path.africa-country-path", { autoAlpha: 0 });
      gsap.set("path.africa-participating", {
        fill: "rgba(30, 42, 74, 0.08)",
        stroke: "rgba(30, 42, 74, 0.28)",
        strokeWidth: 0.75,
      });
      gsap.set(".africa-pop", { scale: 0, transformOrigin: "50% 50%" });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrapRef.current,
          start: "top 72%",
          once: true,
        },
      });
      tl.to("path.africa-country-path", {
        autoAlpha: 1,
        duration: 0.4,
        stagger: 0.015,
      })
        .to(
          "path.africa-participating",
          {
            fill: "rgba(224, 161, 34, 0.32)",
            stroke: "#9A6E0F",
            strokeWidth: 1,
            duration: 0.5,
            stagger: 0.08,
            clearProps: "fill,stroke,strokeWidth",
          },
          "-=0.25",
        )
        .to(
          ".africa-pop",
          { scale: 1, duration: 0.5, ease: "back.out(2.2)", stagger: 0.07 },
          "-=0.15",
        );
    },
    { scope: wrapRef },
  );

  // Textile zoom: the active country scales up in place with a soft
  // drop-shadow, while every other country path dims. Reduced motion:
  // instant, no scale transform on the map (per spec).
  //
  // The scale is applied manually via translate(origin) scale(s)
  // translate(-origin) instead of GSAP's `scale` property: GSAP sets its
  // own inline `transform-origin` for any SVG element it animates a
  // transform on, unconditionally, regardless of the CSS
  // `transform-box: fill-box` declared on .africa-textile or an explicit
  // `svgOrigin` tween property — both were observed collapsing to
  // "0px 0px" (the SVG's own origin) at runtime, scaling the shape from a
  // point far outside itself. Building the matrix by hand from each
  // country's precomputed centroid (TEXTILE_MARKER_POSITIONS) sidesteps
  // that entirely and is guaranteed correct.
  useGSAP(
    () => {
      const reduced = prefersReducedMotion();
      const duration = reduced ? 0 : 0.4;

      textileProfiles.forEach((t) => {
        const el = document.getElementById(t.code);
        const pos = TEXTILE_MARKER_POSITIONS[t.code];
        if (!el || !pos) return;

        const targetScale = t.code === zoomCode ? 1.2 : 1;
        const targetFilter =
          t.code === zoomCode
            ? "drop-shadow(0 10px 18px rgba(23, 28, 38, 0.35))"
            : "none";
        const applyTransform = (s: number) => {
          el.style.transform = `translate(${pos.x}px, ${pos.y}px) scale(${s}) translate(${-pos.x}px, ${-pos.y}px)`;
        };

        if (reduced) {
          textileScale.current[t.code] = targetScale;
          applyTransform(targetScale);
          el.style.filter = targetFilter;
          return;
        }

        const proxy = { s: textileScale.current[t.code] ?? 1 };
        gsap.to(proxy, {
          s: targetScale,
          duration,
          ease: "power2.out",
          onUpdate: () => {
            textileScale.current[t.code] = proxy.s;
            applyTransform(proxy.s);
          },
        });
        gsap.to(el, { filter: targetFilter, duration, ease: "power2.out" });
      });

      const runner = reduced ? gsap.set : gsap.to;
      if (zoomCode) {
        runner(`path.africa-country-path:not(#${zoomCode})`, {
          opacity: 0.5,
          duration,
          ease: "power2.out",
        });
      } else {
        runner("path.africa-country-path", { opacity: 1, duration, ease: "power2.out" });
      }
    },
    { scope: wrapRef, dependencies: [zoomCode] },
  );

  // Hover/focus affordance cue: a soft pulsing gold ring around the
  // country currently signaling "clickable" (reuses the same
  // fromTo/scale/opacity/repeat pulse pattern as the Accra marker above),
  // suppressed once its modal is actually open since the affordance has
  // already served its purpose by then.
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.fromTo(
        ".textile-hover-ring",
        { scale: 0.85, opacity: 0.9 },
        {
          scale: 1.35,
          opacity: 0,
          duration: 1.1,
          repeat: -1,
          ease: "power1.out",
          transformOrigin: "50% 50%",
        },
      );
    },
    { scope: wrapRef, dependencies: [textileHover, textileOpen] },
  );

  // Textile detail modal — click/Enter/Space (any input) opens it as a
  // centered overlay above the map, dimmed backdrop behind it. Kept
  // mounted through its own exit tween (see modalMounted) so it doesn't
  // just vanish; reduced motion swaps both tweens for instant show/hide.
  useGSAP(
    () => {
      const modal = modalRef.current;
      const backdrop = backdropRef.current;
      if (!modal || !backdrop) return;
      const reduced = prefersReducedMotion();

      // Plain opacity, not autoAlpha: the modal is conditionally mounted
      // by React (modalMounted) rather than kept in the DOM and hidden via
      // visibility, so there's no visibility toggling to do here — and
      // critically, autoAlpha's "from" state sets visibility: hidden
      // synchronously the instant the tween is created, which would make
      // the immediate closeButtonRef.current?.focus() below silently fail
      // (browsers refuse to focus a hidden element). It'd also cap the
      // backdrop at opacity 1 on its "visible" end, when the spec wants it
      // dimmed to 0.4, not opaque.
      if (textileOpen) {
        if (reduced) {
          gsap.set(backdrop, { opacity: 0.4 });
          gsap.set(modal, { opacity: 1, scale: 1 });
        } else {
          gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 0.4, duration: 0.3, ease: "power2.out" });
          gsap.fromTo(
            modal,
            { opacity: 0, scale: 0.94 },
            { opacity: 1, scale: 1, duration: 0.35, ease: "power2.out" },
          );
        }
        closeButtonRef.current?.focus();
      } else if (modalMounted) {
        const finishClose = () => {
          setModalMounted(false);
          lastTriggerRef.current?.focus();
        };
        if (reduced) {
          finishClose();
        } else {
          gsap.to(backdrop, { opacity: 0, duration: 0.25, ease: "power2.in" });
          gsap.to(modal, {
            opacity: 0,
            scale: 0.94,
            duration: 0.25,
            ease: "power2.in",
            onComplete: finishClose,
          });
        }
      }
    },
    { scope: wrapRef, dependencies: [textileOpen, modalMounted] },
  );

  return (
    <div
      ref={wrapRef}
      className={`relative ${className}`}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setSelected(null);
          setTextileOpen(null);
        }
      }}
    >
      <svg
        viewBox="0 0 1000 1001"
        role="img"
        aria-label="Map of Africa showing countries participating in Alt.FFF 2026"
        className="h-auto w-full"
        onClick={() => {
          setSelected(null);
        }}
      >
        {COUNTRIES.map((c) => {
          const p = byCode.get(c.code);
          const t = textileByCode.get(c.code);
          const classes = [
            "africa-country-path",
            p ? "africa-participating" : "",
            t ? "africa-textile" : "",
          ]
            .filter(Boolean)
            .join(" ");
          // Textile-tier countries get their interactive props on a
          // separate, stable hit-rect (rendered after all paths, below)
          // instead of on the path itself — see TEXTILE_HIT_BOUNDS comment.
          // This also gives textile tier priority over the plain
          // participant tooltip for any country in both tiers (Ghana).
          const props = t
            ? { "aria-hidden": true as const }
            : p
              ? interactiveProps(c.code, p.name)
              : { "aria-hidden": true as const };
          return (
            <path
              key={c.code}
              id={c.code}
              data-name={c.name}
              d={c.d}
              className={classes}
              data-selected={
                selected === c.code || (t && zoomCode === c.code) || undefined
              }
              {...props}
            />
          );
        })}

        {/* Stable pointer/keyboard targets for the four textile-tier
            countries — always the topmost hit target within their bounds,
            regardless of alphabetical paint order among the 50 paths. */}
        {textileProfiles.map((t) => {
          const b = TEXTILE_HIT_BOUNDS[t.code];
          if (!b) return null;
          return (
            <rect
              key={`hit-${t.code}`}
              x={b.x}
              y={b.y}
              width={b.width}
              height={b.height}
              fill="transparent"
              style={{ pointerEvents: "auto", cursor: "pointer" }}
              {...textileInteractiveProps(t.code, t.country)}
            />
          );
        })}

        {Object.entries(ISLAND_POSITIONS).map(([code, isl]) => {
          const p = byCode.get(code);
          return (
            <g
              key={code}
              className={`africa-pop ${p ? "africa-island-group" : ""}`}
              {...(p ? interactiveProps(code, p.name) : { "aria-hidden": true })}
            >
              {p && (
                <circle
                  cx={isl.x}
                  cy={isl.y}
                  r="10"
                  fill="transparent"
                  style={{ pointerEvents: "auto" }}
                />
              )}
              <circle
                cx={isl.x}
                cy={isl.y}
                r="4"
                className={p ? "africa-participating" : ""}
                data-selected={selected === code || undefined}
                fill={p ? undefined : "rgba(30, 42, 74, 0.35)"}
              />
              <text
                x={isl.x + (isl.anchor === "start" ? 9 : -9)}
                y={isl.y + 3}
                textAnchor={isl.anchor}
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fill: p ? "var(--ink)" : "rgba(30, 42, 74, 0.55)",
                }}
              >
                {isl.name}
              </text>
            </g>
          );
        })}

        {/* Accra host-city marker */}
        <g className="africa-pop" pointerEvents="none">
          <circle
            className="accra-pulse"
            cx={ACCRA_POSITION.x}
            cy={ACCRA_POSITION.y}
            r="10"
            fill="var(--gold)"
            opacity="0.5"
          />
          <circle
            cx={ACCRA_POSITION.x}
            cy={ACCRA_POSITION.y}
            r="4.5"
            fill="var(--gold)"
            stroke="#9A6E0F"
            strokeWidth="1"
          />
          <text
            x={ACCRA_POSITION.x + 12}
            y={ACCRA_POSITION.y + 4}
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fill: "var(--ink)",
            }}
          >
            Accra · Host City
          </text>
        </g>

        {/* Textile-tier "explorable" markers — smaller-scale version of the
            Accra pulse, purely decorative (the path itself is the hit
            target, via .africa-textile). */}
        {textileProfiles.map((t) => {
          const pos = TEXTILE_MARKER_POSITIONS[t.code];
          if (!pos) return null;
          return (
            <g key={t.code} className="africa-pop" pointerEvents="none">
              <circle
                className="textile-pulse"
                cx={pos.x}
                cy={pos.y}
                r="6"
                fill="var(--gold)"
                opacity="0.55"
              />
              <circle cx={pos.x} cy={pos.y} r="2.5" fill="var(--gold)" />
            </g>
          );
        })}

        {/* Hover/focus affordance ring — "this is clickable", not the
            detail content. Sized per country from its own hit-bounds so
            the halo reads proportionally whether it's Ghana or Ethiopia.
            Suppressed once the modal is open (see the pulse effect above
            for the animation itself). */}
        {textileProfiles.map((t) => {
          const pos = TEXTILE_MARKER_POSITIONS[t.code];
          const bounds = TEXTILE_HIT_BOUNDS[t.code];
          if (!pos || !bounds || textileHover !== t.code || textileOpen === t.code) return null;
          const ringRadius = Math.max(bounds.width, bounds.height) / 2 + 15;
          return (
            <circle
              key={`hover-ring-${t.code}`}
              className="textile-hover-ring"
              cx={pos.x}
              cy={pos.y}
              r={ringRadius}
              fill="none"
              stroke="var(--gold)"
              strokeWidth={3}
              pointerEvents="none"
            />
          );
        })}
      </svg>

      {/* Cursor tooltip (mouse only) */}
      {hoverParticipant && (
        <div
          ref={tooltipRef}
          className="pointer-events-none absolute left-0 top-0 z-10 w-max max-w-56 rounded-md border border-hairline bg-surface p-3 shadow-[0_6px_24px_rgba(23,28,38,0.14)]"
        >
          <ParticipantInfo p={hoverParticipant} />
        </div>
      )}

      {/* Info card — tap (touch) and keyboard focus render here */}
      {selectedParticipant && (
        <div className="mt-4 rounded-md border border-hairline bg-surface p-4">
          <ParticipantInfo p={selectedParticipant} />
        </div>
      )}

      {/* Textile detail modal — click/Enter/Space/tap opens this as a
          centered overlay floating above the map, with a dimmed backdrop
          behind it (closing on Escape, a backdrop click, or the close
          button). Kept mounted through its own exit tween via
          modalMounted; content keeps showing the last-open country
          through that fade via modalCode so it doesn't blank mid-exit. */}
      {modalMounted && (
        <div className="fixed inset-0 z-[100]">
          <div
            ref={backdropRef}
            aria-hidden="true"
            onClick={() => setTextileOpen(null)}
            className="absolute inset-0 bg-ink"
            style={{ opacity: 0 }}
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
            <div
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="textile-modal-heading"
              onClick={(e) => e.stopPropagation()}
              className="pointer-events-auto relative w-full max-w-md overflow-hidden rounded-lg bg-surface shadow-[0_30px_70px_rgba(23,28,38,0.35)]"
              style={{ opacity: 0 }}
            >
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Close"
                onClick={() => setTextileOpen(null)}
                className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink"
              >
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <path
                    d="M1 1 L15 15 M15 1 L1 15"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <div className="p-6">
                {modalTextile && <TextileInfo t={modalTextile} headingId="textile-modal-heading" />}
              </div>
              <TextileMotifBorder />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
