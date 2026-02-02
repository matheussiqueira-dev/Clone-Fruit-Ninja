using System.Collections.Generic;
using UnityEngine;

namespace FruitNinjaClone.Utils
{
    public static class SplineUtils
    {
        public static Vector2 CatmullRom(Vector2 p0, Vector2 p1, Vector2 p2, Vector2 p3, float t)
        {
            float t2 = t * t;
            float t3 = t2 * t;
            return 0.5f * ((2f * p1) + (-p0 + p2) * t + (2f * p0 - 5f * p1 + 4f * p2 - p3) * t2 + (-p0 + 3f * p1 - 3f * p2 + p3) * t3);
        }

        public static int AppendCatmullRom(List<Vector2> output, Vector2 p0, Vector2 p1, Vector2 p2, Vector2 p3, int subdivisions)
        {
            for (int i = 1; i <= subdivisions; i++)
            {
                float t = i / (float)subdivisions;
                output.Add(CatmullRom(p0, p1, p2, p3, t));
            }
            return subdivisions;
        }
    }
}
