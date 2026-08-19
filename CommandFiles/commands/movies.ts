export const meta: CommandMeta = {
  name: "movies",
  author: "rifat, fixed by liane and symer",
  noPrefix: false,
  version: "1.0.1",
  description: "Search movie details using OMDB",
  usage: "movies <movie title>",
  role: 0,
  requirement: "3.0.0",
  icon: "🎬",
  category: "Media",
  otherNames: ["mov"],
};

export const style: CommandStyle = {
  title: "OMDB Movie Search 🎥",
  titleFont: "bold",
  contentFont: "fancy",
};

export interface Movie {
  Title: string;
  Year: string;
  Rated: string;
  Released: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Writer: string;
  Actors: string;
  Plot: string;
  Language: string;
  Country: string;
  Awards: string;
  Poster: string;
  Ratings: Array<{
    Source: string;
    Value: string;
  }>;
  Metascore: string;
  imdbRating: string;
  imdbVotes: string;
  imdbID: string;
  Type: string;
  DVD: string;
  BoxOffice: string;
  Production: string;
  Website: string;
  Response: string;
}

export async function entry({ output, args }: CommandContext) {
  const query = args.join(" ");
  if (!query) {
    return output.reply("❌ | Please enter a movie title to search.");
  }

  const apiKey = "ec7115";
  const url = "http://www.omdbapi.com/";

  try {
    const movie: Movie = await output.req(url, {
      t: query,
      plot: "full",
      apiKey,
    });

    if (movie.Response === "False") {
      return output.reply(`❌ | Movie not found: ${query}`);
    }

    const msg = `🎬 ***${movie.Title}*** (${movie.Year})
⭐ **IMDB**: ${movie.imdbRating}
📂 **Genre**: ${movie.Genre}
🎭 **Actors**: ${movie.Actors}
📝 **Plot**: ${movie.Plot}
🌐 **Language**: ${movie.Language}
🎬 **Director**: ${movie.Director}
⌛ **Runtime**: ${movie.Runtime}`;

    if (movie.Poster !== "N/A") {
      return output.attach(msg, movie.Poster);
    }
    return output.reply(msg);
  } catch (err) {
    return output.reply("❌ | Failed to fetch movie data. Please try again.");
  }
}
